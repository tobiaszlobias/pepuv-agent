// ČÚZK REST API helper
// API klíč NESMÍ být na klientovi — vždy volej přes server-side route
// Docs: https://api-kn.cuzk.gov.cz/Swagger

const CUZK_BASE = "https://api-kn.cuzk.gov.cz";

export const KOD_CASTI_OBCE: Record<string, number> = {
  "holešovice": 490067,
  "vinohrady":  490229,
  "žižkov":     490261,
  "smíchov":    400301,
  "dejvice":    400459,
  "karlín":     400637,
};

export interface BuildingInfo {
  typStavby: string;
  zpusobVyuziti: string;
  zpusobyOchrany: string[];
  pocetJednotek: number;
  cislaDomovni: number[];
  castObce: string;
  parcelniCisla: number[];
  lv: { cislo: number; katastralniUzemi: string } | null;
  maRizeni: boolean;
}

export async function searchBuilding(
  cisloDomovni: number,
  kodCastiObce: number
): Promise<BuildingInfo | null> {
  const params = new URLSearchParams({
    CisloDomovni: String(cisloDomovni),
    KodCastiObce: String(kodCastiObce),
    TypStavby: "1",
  });

  const res = await fetch(
    `${CUZK_BASE}/api/v1/Stavby/Vyhledani?${params}`,
    { headers: getHeaders() }
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ČÚZK API error ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    data?: Record<string, unknown>[];
    zpravy?: unknown[];
  };

  const raw = json.data?.[0] as Record<string, unknown> | undefined;
  if (!raw) return null;

  const zpusobVyuziti = (raw.zpusobVyuziti as { nazev?: string } | null)?.nazev ?? "";
  const typStavby = (raw.typStavby as { nazev?: string } | null)?.nazev ?? "";
  const castObce = (raw.castObce as { nazev?: string } | null)?.nazev ?? "";
  const ochrany = (raw.zpusobyOchrany as { nazev: string }[] | null) ?? [];
  const jednotky = (raw.jednotky as unknown[] | null) ?? [];
  const parcely = (raw.parcely as { kmenoveCisloParcely: number }[] | null) ?? [];
  const lv = raw.lv as { cislo: number; katastralniUzemi?: { nazev?: string } } | null;
  const rizeni = (raw.rizeniPlomby as unknown[] | null) ?? [];

  return {
    typStavby,
    zpusobVyuziti,
    zpusobyOchrany: ochrany.map((o) => o.nazev),
    pocetJednotek: jednotky.length,
    cislaDomovni: (raw.cislaDomovni as number[] | null) ?? [],
    castObce,
    parcelniCisla: parcely.map((p) => p.kmenoveCisloParcely),
    lv: lv ? { cislo: lv.cislo, katastralniUzemi: lv.katastralniUzemi?.nazev ?? "" } : null,
    maRizeni: rizeni.length > 0,
  };
}

function getHeaders() {
  const apiKey = process.env.CUZK_API_KEY;
  if (!apiKey) throw new Error("CUZK_API_KEY not set");
  return {
    ApiKey: apiKey,
    "Content-Type": "application/json",
  };
}

export async function searchByAddress(address: string) {
  const params = new URLSearchParams({ adresa: address });
  const res = await fetch(`${CUZK_BASE}/api/Budova/Vyhledat?${params}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ČÚZK API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function searchByParcel(parcelNumber: string, cadastralArea?: string) {
  const params = new URLSearchParams({
    parcelniCislo: parcelNumber,
    ...(cadastralArea && { katastrUzemi: cadastralArea }),
  });

  const res = await fetch(`${CUZK_BASE}/api/Parcela/Vyhledat?${params}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ČÚZK API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function getBuildingDetail(budovaId: string) {
  const res = await fetch(`${CUZK_BASE}/api/Budova/${budovaId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ČÚZK API error ${res.status}: ${text}`);
  }

  return res.json();
}
