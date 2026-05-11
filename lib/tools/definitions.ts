import Anthropic from "@anthropic-ai/sdk";

export const agentTools: Anthropic.Tool[] = [
  {
    name: "get_clients",
    description:
      "Získá seznam klientů z interní databáze (Google Sheets). Filtruje podle čtvrtletí, roku, zdroje nebo statusu. Používej pro dotazy jako 'jací noví klienti za Q1', 'klienti ze Sreality', 'aktivní klienti'.",
    input_schema: {
      type: "object",
      properties: {
        quarter: {
          type: "string",
          description: "Čtvrtletí: Q1, Q2, Q3, Q4",
        },
        year: {
          type: "number",
          description: "Rok, např. 2024 nebo 2025",
        },
        source: {
          type: "string",
          description: "Zdroj klienta: web, doporučení, inzerce, sreality",
        },
        status: {
          type: "string",
          description: "Status klienta: aktivní, uzavřený, lead",
        },
      },
      required: [],
    },
  },
  {
    name: "get_properties",
    description:
      "Získá seznam nemovitostí z databáze. Filtruje podle statusu, typu nebo chybějících polí. Používej pro dotazy jako 'nemovitosti k prodeji', 'byty v Holešovicích', 'nemovitosti bez dat o rekonstrukci'.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Status: k_prodeji, prodáno, rezervováno",
        },
        type: {
          type: "string",
          description: "Typ nemovitosti: byt, dům, pozemek",
        },
        missing_field: {
          type: "string",
          description:
            "Vrátí pouze záznamy, kde toto pole chybí, např. rok_rekonstrukce",
        },
        city: {
          type: "string",
          description: "Město nebo čtvrť, např. Praha, Holešovice, Vinohrady",
        },
      },
      required: [],
    },
  },
  {
    name: "get_leads",
    description:
      "Získá data o leadech a prodejích. Filtruje podle počtu měsíců nebo zdroje. Používej pro trendy, grafy vývoje, statistiky leadů.",
    input_schema: {
      type: "object",
      properties: {
        months: {
          type: "number",
          description: "Počet posledních měsíců, např. 6 nebo 12",
        },
        source: {
          type: "string",
          description: "Zdroj leadů: web, doporučení, inzerce, sreality",
        },
        status: {
          type: "string",
          description: "Status: nový, kontaktován, prohlídka, nabídka, uzavřen, ztracen",
        },
      },
      required: [],
    },
  },
  {
    name: "search_cuzk",
    description:
      "Vyhledá informace o nemovitosti v Katastru nemovitostí (ČÚZK). Vrátí data o vlastníkovi, parcelním čísle, výměře a právních vztazích. Používej pro ověření katastrálních dat.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Adresa nemovitosti, např. 'Holešovická 15, Praha 7'",
        },
        parcel_number: {
          type: "string",
          description: "Katastrální číslo parcely",
        },
        cadastral_area: {
          type: "string",
          description: "Název katastrálního území",
        },
      },
      required: [],
    },
  },
  {
    name: "search_sreality",
    description:
      "Vyhledá aktuální nabídky nemovitostí na Sreality přes Apify scraper. Používej pro monitoring trhu, srovnání cen, přehled nových nabídek v dané lokalitě.",
    input_schema: {
      type: "object",
      properties: {
        locality: {
          type: "string",
          description: "Lokalita, např. 'Praha Holešovice', 'Praha 7'",
        },
        property_type: {
          type: "string",
          description: "Typ nemovitosti: byt, dům, pozemek",
        },
        max_price: {
          type: "number",
          description: "Maximální cena v Kč",
        },
        transaction_type: {
          type: "string",
          description: "Typ transakce: prodej, pronájem",
        },
      },
      required: ["locality"],
    },
  },
  {
    name: "draft_email",
    description:
      "Navrhne profesionální email pro klienta. Vybere vhodný termín prohlídky z dostupných slotů v kalendáři. Používej pro komunikaci s klienty, doporučení termínů prohlídek.",
    input_schema: {
      type: "object",
      properties: {
        client_name: {
          type: "string",
          description: "Jméno klienta",
        },
        property_address: {
          type: "string",
          description: "Adresa nemovitosti",
        },
        available_slots: {
          type: "array",
          items: { type: "string" },
          description: "Dostupné termíny, např. ['středa 14:00', 'pátek 10:00']",
        },
        email_type: {
          type: "string",
          description: "Typ emailu: prohlídka, nabídka, follow_up, potvrzení",
        },
      },
      required: ["client_name", "property_address"],
    },
  },
  {
    name: "generate_report",
    description:
      "Vygeneruje týdenní report s přehledem výsledků. Vrátí data pro 3 prezentační slidy: přehled leadů, nemovitosti, uzavřené obchody. Používej pro reporty a prezentace.",
    input_schema: {
      type: "object",
      properties: {
        week: {
          type: "string",
          description:
            "Týden ve formátu 'YYYY-Www' nebo 'poslední týden', např. '2025-W18'",
        },
        include_charts: {
          type: "boolean",
          description: "Zda zahrnout data pro grafy",
        },
      },
      required: ["week"],
    },
  },
  {
    name: "create_chart",
    description:
      "Vytvoří datovou strukturu pro vizualizaci grafu (bar, line nebo pie chart). Vrátí JSON s daty pro Recharts komponentu. Používej vždy, když uživatel chce vidět data graficky.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["bar", "line", "pie"],
          description: "Typ grafu: bar (sloupcový), line (liniový), pie (koláčový)",
        },
        data: {
          type: "object",
          description: "Data pro graf jako JSON objekt s polem 'items'",
        },
        title: {
          type: "string",
          description: "Nadpis grafu",
        },
        x_key: {
          type: "string",
          description: "Klíč pro osu X, např. 'měsíc', 'zdroj'",
        },
        y_key: {
          type: "string",
          description: "Klíč pro osu Y, např. 'počet', 'hodnota'",
        },
      },
      required: ["type", "data", "title"],
    },
  },
];
