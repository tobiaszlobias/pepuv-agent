// ČÚZK REST API helper
// API klíč NESMÍ být na klientovi — vždy volej přes server-side route
// Docs: https://api-kn.cuzk.gov.cz/Swagger

const CUZK_BASE = "https://api-kn.cuzk.gov.cz";

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
