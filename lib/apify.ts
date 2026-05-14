// Sreality API helper — přímé volání bez Apify
// Nahrazuje původní Apify scraper který vracel náhodné výsledky bez možnosti filtrace

const SREALITY_API = "https://www.sreality.cz/api/cs/v2/estates";
const SREALITY_BASE = "https://www.sreality.cz/detail";

// category_sub_cb → URL slug (verified from Sreality HTML)
const SUB_SLUG: Record<number, string> = {
  // Byty (category_main_cb=1)
  2:  "1+1",
  3:  "1+kk",
  4:  "2+kk",
  5:  "2+1",
  6:  "3+kk",
  7:  "3+1",
  8:  "4+kk",
  9:  "4+1",
  10: "5+kk",
  11: "5+1",
  12: "6+",
  16: "atypicky",
  // Domy (category_main_cb=2) — slugs verified from Sreality search HTML
  37: "rodinny",
  38: "chata",
  39: "vila",
  46: "chalupa",
  54: "vicegeneracni-dum",
  // Pozemky (category_main_cb=3)
  19: "ostatni-pozemky",
  20: "pole",
  21: "les",
  22: "louka",
  23: "zahrada",
  24: "ostatni-pozemky",
};

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

// Sreality locality ID mapping — textový název → numerické region ID
// Bez správného ID vrátí API prázdný výsledek nebo celou ČR
const LOCALITY_ID_MAP: Record<string, string> = {
  // Praha čtvrti
  "praha holešovice": "3538",
  "holešovice": "3538",
  "praha vinohrady": "3536",
  "vinohrady": "3536",
  "praha žižkov": "3537",
  "žižkov": "3537",
  "praha smíchov": "3527",
  "smíchov": "3527",
  "praha dejvice": "3521",
  "dejvice": "3521",
  "praha karlín": "3528",
  "karlín": "3528",
  "praha nusle": "3531",
  "nusle": "3531",
  "praha vršovice": "3540",
  "vršovice": "3540",
  // Praha jako celek
  "praha 1": "10001",
  "praha 2": "10002",
  "praha 3": "10003",
  "praha 4": "10004",
  "praha 5": "10005",
  "praha 6": "10006",
  "praha 7": "10007",
  "praha 8": "10008",
  "praha 9": "10009",
  "praha 10": "10010",
  "praha": "10001",
  // Další města
  "brno": "5546",
  "ostrava": "8076",
  "plzeň": "8658",
  "olomouc": "8077",
  "liberec": "5543",
  "hradec králové": "5539",
  "české budějovice": "5540",
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

  // Max cena
  if (params.max_price) {
    query.set("price_max", String(params.max_price));
  }

  query.set("per_page", "20");
  query.set("sort", "0"); // nejnovější

  const localityKey = params.locality.toLowerCase().trim();
  const regionId = LOCALITY_ID_MAP[localityKey] ??
    Object.entries(LOCALITY_ID_MAP).find(([key]) => localityKey.includes(key) || key.includes(localityKey))?.[1];

  async function fetchEstates(extraParams: Record<string, string>): Promise<Record<string, unknown>[]> {
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(extraParams)) q.set(k, v);
    const res = await fetch(`${SREALITY_API}?${q}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });
    if (!res.ok) throw new Error(`Sreality API error ${res.status}`);
    const data = await res.json();
    return data?._embedded?.estates ?? [];
  }

  // Try district ID first; if 0 results fall back to text region search
  let items: Record<string, unknown>[] = [];
  if (regionId) {
    items = await fetchEstates({ locality_district_id: regionId });
  }
  if (items.length === 0) {
    items = await fetchEstates({ region: params.locality });
  }

  return items.map((item) => {
    const hashId = item.hash_id as number;
    const seo = item.seo as Record<string, unknown> | undefined;
    const catMain = seo?.category_main_cb as number;
    const catSub = seo?.category_sub_cb as number;
    const catType = seo?.category_type_cb as number;
    const localitySeo = (seo?.locality as string) || "";

    const transType = catType === 2 ? "pronajem" : "prodej";
    const propType = catMain === 1 ? "byt" : catMain === 2 ? "dum" : catMain === 3 ? "pozemek" : "nemovitost";
    const subSlug = SUB_SLUG[catSub] || "";
    // Strip trailing dashes from locality slug (Sreality API returns e.g. "hodslavice-hodslavice-")
    const localityClean = localitySeo.replace(/-+$/, "");
    const detailUrl = hashId && localityClean
      ? `${SREALITY_BASE}/${transType}/${propType}${subSlug ? `/${subSlug}` : ""}/${localityClean}/${hashId}`
      : hashId
      ? `${SREALITY_BASE}/${transType}/${propType}/${hashId}`
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
