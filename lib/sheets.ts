import { google } from "googleapis";

function getAuth() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT not set");

  const credentials = JSON.parse(
    Buffer.from(serviceAccountJson, "base64").toString("utf-8")
  );

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetData(range: string): Promise<string[][]> {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEETS_ID not set");

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  return (response.data.values as string[][]) || [];
}

export async function getClients(filters?: {
  quarter?: string;
  year?: number;
  source?: string;
  status?: string;
}) {
  const rows = await getSheetData("Klienti!A2:H");

  interface Client {
    id: string;
    jmeno: string;
    email: string;
    telefon: string;
    zdroj: string;
    datum_pridani: string;
    status: string;
    makler: string;
  }

  let clients: Client[] = rows.map((row) => ({
    id: row[0] || "",
    jmeno: row[1] || "",
    email: row[2] || "",
    telefon: row[3] || "",
    zdroj: row[4] || "",
    datum_pridani: row[5] || "",
    status: row[6] || "",
    makler: row[7] || "",
  }));

  if (filters?.source) {
    clients = clients.filter((c) =>
      c.zdroj.toLowerCase().includes(filters.source!.toLowerCase())
    );
  }

  if (filters?.status) {
    clients = clients.filter((c) =>
      c.status.toLowerCase().includes(filters.status!.toLowerCase())
    );
  }

  if (filters?.year || filters?.quarter) {
    // When filtering by quarter, always require an explicit year.
    // If no year given, default to current year so results are deterministic.
    const targetYear = filters.year ?? new Date().getFullYear();
    clients = clients.filter((c) => {
      if (!c.datum_pridani) return false;
      const date = new Date(c.datum_pridani);
      if (date.getFullYear() !== targetYear) return false;
      if (filters.quarter) {
        const q = Math.ceil((date.getMonth() + 1) / 3);
        const qNum = parseInt(filters.quarter.replace("Q", ""));
        if (q !== qNum) return false;
      }
      return true;
    });
  }

  console.log("get_clients raw:", clients.length, "filters:", JSON.stringify(filters ?? {}), "sources:", clients.map((c) => c.zdroj));
  return clients;
}

export async function getProperties(filters?: {
  status?: string;
  type?: string;
  missing_field?: string;
  city?: string;
}) {
  const rows = await getSheetData("Nemovitosti!A2:L");

  interface Property {
    id: string;
    adresa: string;
    mesto: string;
    ctvrt: string;
    typ: string;
    cena: string;
    stav: string;
    rok_rekonstrukce: string;
    poznamky_rekonstrukce: string;
    katastralni_cislo: string;
    makler: string;
    datum_pridani: string;
  }

  let properties: Property[] = rows.map((row) => ({
    id: row[0] || "",
    adresa: row[1] || "",
    mesto: row[2] || "",
    ctvrt: row[3] || "",
    typ: row[4] || "",
    cena: row[5] || "",
    stav: row[6] || "",
    rok_rekonstrukce: row[7] || "",
    poznamky_rekonstrukce: row[8] || "",
    katastralni_cislo: row[9] || "",
    makler: row[10] || "",
    datum_pridani: row[11] || "",
  }));

  if (filters?.status) {
    properties = properties.filter((p) =>
      p.stav.toLowerCase().includes(filters.status!.toLowerCase())
    );
  }

  if (filters?.type) {
    properties = properties.filter((p) =>
      p.typ.toLowerCase().includes(filters.type!.toLowerCase())
    );
  }

  if (filters?.city) {
    properties = properties.filter(
      (p) =>
        p.mesto.toLowerCase().includes(filters.city!.toLowerCase()) ||
        p.ctvrt.toLowerCase().includes(filters.city!.toLowerCase())
    );
  }

  if (filters?.missing_field) {
    const field = filters.missing_field as keyof Property;
    properties = properties.filter((p) => !p[field] || p[field] === "");
  }

  return properties;
}

export async function getLeads(filters?: {
  months?: number;
  source?: string;
  status?: string;
}) {
  const rows = await getSheetData("Leady!A2:H");

  interface Lead {
    id: string;
    datum: string;
    zdroj: string;
    typ_nemovitosti: string;
    budget: string;
    status: string;
    makler: string;
  }

  let leads: Lead[] = rows.map((row) => ({
    id: row[0] || "",
    datum: row[1] || "",
    zdroj: row[2] || "",
    typ_nemovitosti: row[3] || "",
    budget: row[4] || "",
    status: row[5] || "",
    makler: row[6] || "",
  }));

  if (filters?.months) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - filters.months);
    leads = leads.filter((l) => {
      if (!l.datum) return false;
      return new Date(l.datum) >= cutoff;
    });
  }

  if (filters?.source) {
    leads = leads.filter((l) =>
      l.zdroj.toLowerCase().includes(filters.source!.toLowerCase())
    );
  }

  if (filters?.status) {
    leads = leads.filter((l) =>
      l.status.toLowerCase().includes(filters.status!.toLowerCase())
    );
  }

  return leads;
}

export async function appendMonitoringRow(row: {
  timestamp: string;
  locality: string;
  count: number;
  listings: { address: string; price: number; url: string }[];
}) {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEETS_ID not set");

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const topListings = row.listings
    .slice(0, 3)
    .map((l) => `${l.address} (${l.price > 0 ? (l.price / 1_000_000).toFixed(1) + "M" : "—"})`)
    .join(" | ");

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Monitoring!A:E",
    valueInputOption: "RAW",
    requestBody: {
      values: [[row.timestamp, row.locality, row.count, topListings, new Date().toLocaleDateString("cs-CZ")]],
    },
  });
}
