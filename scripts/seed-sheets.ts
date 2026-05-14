/**
 * seed-sheets.ts
 * Naplní Google Sheet realistickými daty:
 *   - Sheet "Klienti"      — 50 mock klientů
 *   - Sheet "Nemovitosti"  — ~30 nemovitostí z ČÚZK API + doplněno mockem
 *   - Sheet "Leady"        — 50 mock leadů
 *
 * Spuštění:
 *   npx ts-node scripts/seed-sheets.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { google } from "googleapis";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const CUZK_KEY = process.env.CUZK_API_KEY!;
const CUZK_BASE = "https://api-kn.cuzk.gov.cz/api/v1";

// Kódy částí obce Praha (z ČÚZK číselníku)
const PRAHA_CASTI = [
  { kod: 490067, nazev: "Holešovice", ctvrt: "Praha 7" },
  { kod: 490229, nazev: "Vinohrady", ctvrt: "Praha 2" },
  { kod: 490261, nazev: "Žižkov", ctvrt: "Praha 3" },
  { kod: 400301, nazev: "Smíchov", ctvrt: "Praha 5" },
  { kod: 400459, nazev: "Dejvice", ctvrt: "Praha 6" },
  { kod: 400637, nazev: "Karlín", ctvrt: "Praha 8" },
];

// ─── GOOGLE AUTH ──────────────────────────────────────────────────────────────

function getSheets() {
  const svcJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!svcJson) throw new Error("GOOGLE_SERVICE_ACCOUNT not set in .env.local");

  const credentials = JSON.parse(Buffer.from(svcJson, "base64").toString("utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function writeSheet(
  sheets: ReturnType<typeof google.sheets>,
  range: string,
  values: (string | number)[][]
) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
  console.log(`✓ Zapsáno ${values.length - 1} řádků do ${range}`);
}

// ─── ČÚZK — stáhni stavby ─────────────────────────────────────────────────────

interface CuzkStavba {
  id: number;
  cislaDomovni: number[];
  castObce: { nazev: string };
  zpusobVyuziti?: { nazev: string };
  adresniMista?: number[]; // ČÚZK vrací jen ID adresních míst
  lv?: { cislo: number; katastralniUzemi: { nazev: string } };
}

async function fetchStavbyZCUZK(): Promise<CuzkStavba[]> {
  console.log("\n📡 Stahuju stavby z ČÚZK API...");

  const results: CuzkStavba[] = [];
  // Prohledám různá čísla popisná v různých čtvrtích
  const cisla = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

  for (const cast of PRAHA_CASTI) {
    for (const cp of cisla) {
      if (results.length >= 30) break;
      try {
        const url = `${CUZK_BASE}/Stavby/Vyhledani?KodCastiObce=${cast.kod}&TypStavby=1&CisloDomovni=${cp}`;
        const res = await fetch(url, { headers: { ApiKey: CUZK_KEY } });
        if (!res.ok) continue;

        const json = (await res.json()) as { data?: CuzkStavba[] };
        const stavby = json.data || [];

        for (const stavba of stavby.slice(0, 2)) {
          results.push({ ...stavba, castObce: { nazev: cast.nazev } });
        }

        // Rate limiting — ČÚZK má 500 volání/den, buď opatrný
        await sleep(200);
      } catch {
        // ignoruj jednotlivé chyby
      }
    }
    if (results.length >= 30) break;
  }

  console.log(`  → Nalezeno ${results.length} staveb z ČÚZK`);
  return results;
}

// ─── MOCK DATA GENERATORS ─────────────────────────────────────────────────────

const JMENA_MUZSKA = [
  "Jan Novák", "Petr Svoboda", "Martin Dvořák", "Jakub Černý", "Tomáš Procházka",
  "Ondřej Kučera", "Lukáš Veselý", "Michal Horák", "David Blažek", "Pavel Fiala",
  "Jiří Kratochvíl", "Radek Pokorný", "Stanislav Urban", "Karel Čech", "Roman Marek",
];

const JMENA_ZENSKA = [
  "Jana Nováková", "Petra Svobodová", "Marie Dvořáčková", "Eva Černá", "Lucie Procházková",
  "Kateřina Kučerová", "Tereza Veselá", "Monika Horáková", "Alena Blažková", "Lenka Fialová",
  "Zuzana Kratochvílová", "Renata Pokorná", "Helena Urbanová", "Markéta Čechová", "Simona Marková",
];

const VSECHNA_JMENA = [...JMENA_MUZSKA, ...JMENA_ZENSKA];

const MAKLERS = ["Adam Novotný", "Barbora Horáčková", "Tomáš Sedláček", "Klára Benešová"];

const ULICE_HOLESOVICE = [
  "Dělnická", "Komunardů", "Ortenovo náměstí", "Jablonského", "Heřmanova",
  "Letenské náměstí", "Milady Horákové", "Nábřeží Kpt. Jaroše",
];
const ULICE_VINOHRADY = [
  "Mánesova", "Blanická", "Korunní", "Máchova", "Polská",
  "Italská", "Rumunská", "Belgická",
];
const ULICE_ZIZKOV = [
  "Seifertova", "Prokopova", "Chelčického", "Řehořova", "Husitská",
];
const ULICE_SMICHOV = [
  "Nádražní", "Plzeňská", "Holečkova", "Štefánikova", "Lidická",
];
const ULICE_DEJVICE = [
  "Evropská", "Dejvická", "Čs. armády", "Terronská", "Na Ořechovce",
];
const ULICE_KARLIN = [
  "Sokolovská", "Karlínské náměstí", "Thámova", "Kollárova", "Palackého náměstí",
];

const ULICE_BY_CAST: Record<string, string[]> = {
  Holešovice: ULICE_HOLESOVICE,
  Vinohrady: ULICE_VINOHRADY,
  Žižkov: ULICE_ZIZKOV,
  Smíchov: ULICE_SMICHOV,
  Dejvice: ULICE_DEJVICE,
  Karlín: ULICE_KARLIN,
};

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(from: Date, to: Date): string {
  const d = new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
  return d.toISOString().split("T")[0];
}

function randEmail(jmeno: string): string {
  const clean = jmeno
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".");
  const domains = ["gmail.com", "seznam.cz", "email.cz", "centrum.cz"];
  return `${clean}${randInt(1, 99)}@${rand(domains)}`;
}

function randPhone(): string {
  return `+420 ${randInt(600, 799)} ${randInt(100, 999)} ${randInt(100, 999)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── KLIENTI ──────────────────────────────────────────────────────────────────

function generateKlienti(): (string | number)[][] {
  const headers = ["id", "jméno", "email", "telefon", "zdroj", "datum_přidání", "status", "makléř"];
  const zdroje = ["web", "doporučení", "inzerce", "sreality"];
  const today = new Date();
  const from = new Date("2024-01-01");

  const rows: (string | number)[][] = [headers];

  for (let i = 1; i <= 60; i++) {
    const jmeno = rand(VSECHNA_JMENA);
    const zdroj = rand(zdroje);
    // Poslední 3 měsíce — více nových klientů pro realismus
    const isRecent = i > 45;
    const dateFrom = isRecent ? new Date(today.getFullYear(), today.getMonth() - 3, 1) : from;
    const status = Math.random() < 0.5 ? "aktivní" : Math.random() < 0.5 ? "lead" : "uzavřený";

    rows.push([
      i,
      jmeno,
      randEmail(jmeno),
      randPhone(),
      zdroj,
      randDate(dateFrom, today),
      status,
      rand(MAKLERS),
    ]);
  }

  return rows;
}

// ─── LEADY ────────────────────────────────────────────────────────────────────

function generateLeady(): (string | number)[][] {
  const headers = ["id", "datum", "zdroj", "typ_nemovitosti", "budget", "status", "makléř"];
  const zdroje = ["web", "doporučení", "inzerce", "sreality"];
  const typy = ["byt", "dům", "pozemek"];
  const statusy = ["nový", "kontaktován", "prohlídka", "nabídka", "uzavřen", "ztracen"];
  const today = new Date();
  const from = new Date("2024-07-01");

  const rows: (string | number)[][] = [headers];

  for (let i = 1; i <= 70; i++) {
    const typ = rand(typy);
    // Budget jako číslo v Kč (ne string) — agent s tím může počítat
    let budget: number;
    if (typ === "byt") {
      budget = randInt(3, 12) * 1_000_000;
    } else if (typ === "dům") {
      budget = randInt(8, 25) * 1_000_000;
    } else {
      budget = randInt(1, 8) * 1_000_000;
    }

    // Poslední 3 měsíce — čerstvá data
    const isRecent = i > 50;
    const dateFrom = isRecent ? new Date(today.getFullYear(), today.getMonth() - 3, 1) : from;

    // Realistické rozložení statusů — více aktivních než uzavřených
    let status: string;
    const r = Math.random();
    if (isRecent) {
      status = r < 0.3 ? "nový" : r < 0.55 ? "kontaktován" : r < 0.75 ? "prohlídka" : r < 0.85 ? "nabídka" : r < 0.92 ? "uzavřen" : "ztracen";
    } else {
      status = rand(statusy);
    }

    rows.push([
      i,
      randDate(dateFrom, today),
      rand(zdroje),
      typ,
      budget,
      status,
      rand(MAKLERS),
    ]);
  }

  return rows;
}

// ─── NEMOVITOSTI (ČÚZK + mock doplnění) ──────────────────────────────────────

function stavbaToRow(
  id: number,
  stavba: CuzkStavba,
  cast: (typeof PRAHA_CASTI)[0]
): (string | number)[] {
  const cp = stavba.cislaDomovni?.[0] || randInt(1, 999);
  // ČÚZK vrací jen ID adresních míst — ulici doplníme z mock dat
  const ulice = rand(ULICE_BY_CAST[cast.nazev] || ULICE_HOLESOVICE);
  const adresa = `${ulice} ${cp}, Praha`;
  const katCislo = stavba.lv
    ? `${stavba.lv.katastralniUzemi.nazev} ${stavba.lv.cislo}`
    : `${cast.nazev} ${randInt(1000, 9999)}`;

  const typVyuziti = stavba.zpusobVyuziti?.nazev?.toLowerCase() || "";
  let typ: string;
  if (typVyuziti.includes("byt") || typVyuziti.includes("jedno")) {
    typ = "byt";
  } else if (typVyuziti.includes("rod") || typVyuziti.includes("obyt")) {
    typ = "dům";
  } else {
    typ = Math.random() < 0.7 ? "byt" : "dům";
  }

  const cena = typ === "byt"
    ? `${randInt(3, 12)}000000`
    : `${randInt(8, 25)}000000`;
  const stav = rand(["k_prodeji", "k_prodeji", "k_prodeji", "rezervováno", "prodáno"]);
  const rokRek = Math.random() < 0.6 ? randInt(2000, 2023) : "";
  const poznamkyRek = rokRek
    ? rand(["kompletní rekonstrukce", "koupelna + kuchyň", "nová okna, podlahy", "částečná rekonstrukce"])
    : "";

  return [
    id,
    adresa,
    "Praha",
    cast.nazev,
    typ,
    cena,
    stav,
    rokRek,
    poznamkyRek,
    katCislo,
    rand(MAKLERS),
    randDate(new Date("2024-01-01"), new Date()),
  ];
}

function generateMockNemovitost(id: number): (string | number)[] {
  const cast = rand(PRAHA_CASTI);
  const ulice = rand(ULICE_BY_CAST[cast.nazev] || ULICE_HOLESOVICE);
  const cp = randInt(1, 999);
  const adresa = `${ulice} ${cp}, Praha`;
  const typ = Math.random() < 0.75 ? "byt" : "dům";
  const cena = typ === "byt"
    ? `${randInt(3, 12)}000000`
    : `${randInt(8, 25)}000000`;
  const stav = rand(["k_prodeji", "k_prodeji", "rezervováno", "prodáno"]);
  const rokRek = Math.random() < 0.5 ? randInt(1995, 2023) : "";
  const poznamky = rokRek
    ? rand(["kompletní rekonstrukce", "koupelna + kuchyň", "nová okna", "částečná rekonstrukce", ""])
    : "";
  const katCislo = `${cast.nazev} ${randInt(1000, 9999)}`;

  return [
    id,
    adresa,
    "Praha",
    cast.nazev,
    typ,
    cena,
    stav,
    rokRek,
    poznamky,
    katCislo,
    rand(MAKLERS),
    randDate(new Date("2024-01-01"), new Date()),
  ];
}

async function generateNemovitosti(
  cuzkStavby: CuzkStavba[]
): Promise<(string | number)[][]> {
  const headers = [
    "id", "adresa", "město", "čtvrť", "typ", "cena", "stav",
    "rok_rekonstrukce", "poznamky_rekonstrukce", "katastralni_cislo", "makléř", "datum_přidání",
  ];

  const rows: (string | number)[][] = [headers];
  let id = 1;

  // Řádky z ČÚZK
  for (const stavba of cuzkStavby) {
    const cast = PRAHA_CASTI.find((c) => c.nazev === stavba.castObce?.nazev) || PRAHA_CASTI[0];
    rows.push(stavbaToRow(id++, stavba, cast));
  }

  // Doplň mockem na 50 celkem
  while (rows.length <= 50) {
    rows.push(generateMockNemovitost(id++));
  }

  return rows;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SHEET_ID) {
    console.error("❌ GOOGLE_SHEETS_ID není nastaven v .env.local");
    console.error("   Vytvoř Google Sheet, nastav GOOGLE_SHEETS_ID a GOOGLE_SERVICE_ACCOUNT");
    process.exit(1);
  }
  if (!CUZK_KEY) {
    console.error("❌ CUZK_API_KEY není nastaven v .env.local");
    process.exit(1);
  }

  console.log("🚀 Pepa Agent — seed Google Sheets");
  console.log(`   Sheet ID: ${SHEET_ID}`);

  // 1. Stáhni stavby z ČÚZK
  const cuzkStavby = await fetchStavbyZCUZK();

  // 2. Vygeneruj data
  console.log("\n📊 Generuji data...");
  const klientiData = generateKlienti();
  const nemovitostiData = await generateNemovitosti(cuzkStavby);
  const leadyData = generateLeady();

  console.log(`  → Klienti: ${klientiData.length - 1} řádků`);
  console.log(`  → Nemovitosti: ${nemovitostiData.length - 1} řádků (${cuzkStavby.length} z ČÚZK)`);
  console.log(`  → Leady: ${leadyData.length - 1} řádků`);

  // 3. Zapiš do Google Sheets
  console.log("\n📝 Zapisuji do Google Sheets...");
  const sheets = getSheets();

  // Vymaž starý obsah před zápisem (clear + write)
  for (const range of ["Klienti!A1:Z1000", "Nemovitosti!A1:Z1000", "Leady!A1:Z1000"]) {
    await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range });
  }

  await writeSheet(sheets, "Klienti!A1", klientiData);
  await writeSheet(sheets, "Nemovitosti!A1", nemovitostiData);
  await writeSheet(sheets, "Leady!A1", leadyData);

  console.log("\n✅ Hotovo! Spusť aplikaci a zkus se zeptat agenta.");
}

main().catch((err) => {
  console.error("❌ Chyba:", err.message);
  process.exit(1);
});
