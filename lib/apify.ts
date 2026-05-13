// Sreality API helper — přímé volání bez Apify
// Nahrazuje původní Apify scraper který vracel náhodné výsledky bez možnosti filtrace

const SREALITY_API = "https://www.sreality.cz/api/cs/v2/estates";
const SREALITY_BASE = "https://www.sreality.cz/detail";

// category_main_cb: 1=byt, 2=dům, 3=pozemek, 4=kancelář, 5=ostatní
const PROPERTY_TYPE_MAP: Record<string, number> = {
  byt: 1,
  dům: 2,
  dum: 2,
  pozemek: 3,
  kancelář: 4,
  kancelar: 4,
  ostatní: 5,
  ostatni: 5,
};

interface SrealityListing {
  address: string;
  price: number;
  type: string;
  url: string;
  description: string;
  scraped_at: string;
}

export async function scrapeSreality(params: {
  locality: string;
  property_type?: string;
  max_price?: number;
  transaction_type?: string;
}): Promise<SrealityListing[]> {
  const query = new URLSearchParams();

  // Typ transakce: 1=prodej (default), 2=pronájem
  query.set("category_type_cb", "1");

  // Typ nemovitosti
  const typRaw = (params.property_type || "").toLowerCase().trim();
  const categoryMain = PROPERTY_TYPE_MAP[typRaw];
  if (categoryMain) {
    query.set("category_main_cb", String(categoryMain));
  }

  // Lokalita
  query.set("region", params.locality);

  // Max cena
  if (params.max_price) {
    query.set("price_max", String(params.max_price));
  }

  query.set("per_page", "20");
  query.set("sort", "0"); // nejnovější

  const url = `${SREALITY_API}?${query}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Sreality API error ${res.status}`);
  }

  const data = await res.json();
  const items: Record<string, unknown>[] = data?._embedded?.estates ?? [];

  return items.map((item) => {
    const hashId = item.hash_id as number;
    const seo = item.seo as Record<string, unknown> | undefined;
    const localitySeo = (seo?.locality as string) || "";
    const catMain = seo?.category_main_cb as number;
    const catSub = seo?.category_sub_cb as number;
    const catType = seo?.category_type_cb as number;

    const detailUrl = hashId && localitySeo
      ? `${SREALITY_BASE}/${catType === 2 ? "pronajem" : "prodej"}/${catMain === 1 ? "byt" : catMain === 2 ? "dum" : "nemovitost"}/${localitySeo}/${hashId}`
      : "";

    const priceRaw = (item.price_czk as { value_raw?: number })?.value_raw ?? 0;

    return {
      address: (item.locality as string) || "",
      price: priceRaw,
      type: (item.name as string) || "",
      url: detailUrl || `https://www.sreality.cz`,
      description: (item.name as string) || "",
      scraped_at: new Date().toISOString(),
    };
  });
}
