// Apify Sreality scraper helper
// Token je server-side only — nikdy neposílat klientovi

const APIFY_BASE = "https://api.apify.com/v2";
const SREALITY_ACTOR = "bebich/sreality-scraper";

interface SrealityListing {
  address: string;
  price: number;
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

  const input = {
    locality: params.locality,
    ...(params.property_type && { propertyType: params.property_type }),
    ...(params.max_price && { maxPrice: params.max_price }),
    ...(params.transaction_type && { transactionType: params.transaction_type }),
    maxItems: 50,
  };

  // Spusť actor a počkej na výsledky
  const runRes = await fetch(
    `${APIFY_BASE}/acts/${encodeURIComponent(SREALITY_ACTOR)}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const text = await runRes.text();
    throw new Error(`Apify error ${runRes.status}: ${text}`);
  }

  const items = await runRes.json();
  return items.map((item: Record<string, unknown>) => ({
    address: (item.address as string) || (item.title as string) || "",
    price: (item.price as number) || 0,
    type: (item.type as string) || "",
    url: (item.url as string) || "",
    description: (item.description as string) || "",
    scraped_at: new Date().toISOString(),
  }));
}
