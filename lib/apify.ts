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

  // Filtruj podle lokality (case-insensitive, partial match)
  const localityLower = params.locality.toLowerCase()
    .replace("holešovice", "holešovic")
    .replace("holesovice", "holešovic");

  const filtered = items.filter((item) => {
    const locality = ((item.locality_text as string) || "").toLowerCase();
    const city = ((item.location_city as string) || "").toLowerCase();
    const district = ((item.location_district as string) || "").toLowerCase();

    const localityWords = localityLower.split(/[\s,]+/).filter(Boolean);
    return localityWords.some(
      (w) => locality.includes(w) || city.includes(w) || district.includes(w)
    );
  });

  // Filtruj podle max ceny
  const priceFiltered =
    params.max_price
      ? filtered.filter((item) => {
          const p = (item.price_czk as number) || (item.price as number) || 0;
          return p === 0 || p <= params.max_price!;
        })
      : filtered;

  // Pokud nic neodpovídá filtraci, vrať prvních 10 výsledků bez filtru jako fallback
  const result = priceFiltered.length > 0 ? priceFiltered : items.slice(0, 10);

  return result.slice(0, 20).map((item) => ({
    address: (item.locality_text as string) || "",
    price: (item.price_czk as number) || (item.price as number) || 0,
    price_czk: item.price_czk as number,
    type: `${item.category_main || ""} ${item.category_sub || ""}`.trim(),
    url: (item.source_url as string) || "",
    description: (item.title as string) || "",
    scraped_at: new Date().toISOString(),
  }));
}
