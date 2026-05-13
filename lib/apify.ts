// Apify Sreality scraper helper
// Token je server-side only — nikdy neposílat klientovi

const APIFY_BASE = "https://api.apify.com/v2";
const SREALITY_ACTOR = "shahidirfan~sreality-cz-scraper";

interface SrealityListing {
  address: string;
  price: number;
  price_czk?: number;
  type: string;
  url: string;
  description?: string;
  images?: string[];
  scraped_at: string;
}

// Normalize Czech strings for fuzzy matching (remove diacritics, lowercase)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export async function scrapeSreality(params: {
  locality: string;
  property_type?: string;
  max_price?: number;
  transaction_type?: string;
}): Promise<SrealityListing[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");

  // Actor nepodporuje filtrování v inputu — stáhneme výsledky a filtrujeme server-side
  const runRes = await fetch(
    `${APIFY_BASE}/acts/${SREALITY_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=60&memory=256`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );

  if (!runRes.ok) {
    const text = await runRes.text();
    throw new Error(`Apify error ${runRes.status}: ${text}`);
  }

  const items: Record<string, unknown>[] = await runRes.json();

  // --- Lokalita ---
  // Rozbij na slova, matchuj každé slovo zvlášť (bez diakritiky)
  const localityWords = normalize(params.locality)
    .split(/[\s,]+/)
    .filter((w) => w.length > 2); // ignoruj "v", "na" apod.

  let filtered = items.filter((item) => {
    const fields = [
      (item.locality_text as string) || "",
      (item.location_city as string) || "",
      (item.location_district as string) || "",
      (item.location_region as string) || "",
      (item.title as string) || "",
    ].map(normalize).join(" ");

    return localityWords.every((w) => fields.includes(w));
  });

  // --- Typ nemovitosti ---
  if (params.property_type) {
    const typNorm = normalize(params.property_type);
    filtered = filtered.filter((item) => {
      const mainCat = normalize((item.category_main as string) || "");
      const subCat = normalize((item.category_sub as string) || "");
      const title = normalize((item.title as string) || "");
      return mainCat.includes(typNorm) || subCat.includes(typNorm) || title.includes(typNorm);
    });
  }

  // --- Max cena ---
  if (params.max_price) {
    filtered = filtered.filter((item) => {
      const p = (item.price_czk as number) || (item.price as number) || 0;
      return p === 0 || p <= params.max_price!;
    });
  }

  return filtered.slice(0, 20).map((item) => ({
    address: (item.locality_text as string) || "",
    price: (item.price_czk as number) || (item.price as number) || 0,
    price_czk: item.price_czk as number,
    type: `${item.category_main || ""} ${item.category_sub || ""}`.trim(),
    url: (item.source_url as string) || "",
    description: (item.title as string) || "",
    scraped_at: new Date().toISOString(),
  }));
}
