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
      "Vyhledá informace o stavbě v Katastru nemovitostí (ČÚZK). " +
      "Vrátí: typ stavby, způsob využití (bytový dům / rodinný dům...), památkovou ochranu, " +
      "počet bytových jednotek a stav právních řízení (plomby — prázdné = čisté, neprázdné = POZOR). " +
      "Pro přesné vyhledání použij cislo_domovni + kod_casti_obce. " +
      "POZOR: API limit 500 volání/den — volej max 2× na jeden dotaz.",
    input_schema: {
      type: "object",
      properties: {
        cislo_domovni: {
          type: "number",
          description:
            "Číslo popisné budovy jako celé číslo, např. 32. Použij spolu s kod_casti_obce.",
        },
        kod_casti_obce: {
          type: "number",
          description:
            "Kód části obce dle ČÚZK: Holešovice=490067, Vinohrady=490229, Žižkov=490261, Smíchov=400301, Dejvice=400459, Karlín=400637.",
        },
        address: {
          type: "string",
          description: "Adresa nemovitosti — záložní varianta pokud nemáš cislo_domovni.",
        },
        parcel_number: {
          type: "string",
          description: "Katastrální číslo parcely.",
        },
        cadastral_area: {
          type: "string",
          description: "Název katastrálního území.",
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
    name: "get_calendar_events",
    description:
      "Načte nadcházející události z Pepova kalendáře. Použij pro dotazy jako 'kdy mám volno', 'co mám tento týden', 'jaké prohlídky mám naplánované'. Vrátí seznam událostí s daty a časy.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Počet dní dopředu, výchozí 7. Pro 'tento týden' použij 7, pro 'tento měsíc' 30.",
        },
      },
      required: [],
    },
  },
  {
    name: "find_free_slots",
    description:
      "Najde volné termíny v Pepově kalendáři pro plánování prohlídek. Vrátí seznam hodinových bloků kdy Pepa nemá jiné schůzky (pracovní doba 8–18, 30min buffer kolem eventů). Použij VŽDY před draft_email pokud uživatel chce navrhnout termín prohlídky.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Počet pracovních dní dopředu pro hledání (výchozí 5). Vynechá víkendy automaticky.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Vytvoří novou událost v Pepově kalendáři. Použij po potvrzení termínu uživatelem.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Název události, např. 'Prohlídka Holešovice — Novák'",
        },
        date: {
          type: "string",
          description: "Datum ve formátu YYYY-MM-DD",
        },
        start: {
          type: "string",
          description: "Čas začátku HH:MM, např. '10:00'",
        },
        end: {
          type: "string",
          description: "Čas konce HH:MM, např. '11:00'",
        },
        description: {
          type: "string",
          description: "Volitelný popis nebo poznámky k události",
        },
      },
      required: ["title", "date", "start", "end"],
    },
  },
  {
    name: "create_chart",
    description: `Vytvoří graf z dat. Vyber typ grafu podle obsahu:

- "pie" — podíly celku, distribuce (zdroje klientů, rozdělení podle statusu, typy nemovitostí). Max 6 položek.
- "line" — vývoj v čase, trendy (leady za měsíce, prodeje za rok). X osa = časové období.
- "bar" — porovnání hodnot mezi kategoriemi (makléři, lokality, ceny). Použij pro vše ostatní.

Pravidla pro "bar":
- Pokud má X osa dlouhé textové labely (adresy, popisy >15 znaků) nebo >8 položek, nastav horizontal: true.
- Jinak nech horizontal: false (výchozí = vertikální sloupce).

Nepoužívej "bar" pro časové řady — na to je "line".
Nepoužívej "pie" pro více než 6 kategorií nebo pro srovnání čísel.`,
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["bar", "line", "pie"],
          description: "Typ grafu. Viz pravidla v description.",
        },
        data: {
          type: "object",
          description: "Data pro graf jako JSON objekt s polem 'items'",
        },
        title: {
          type: "string",
          description: "Krátký nadpis grafu",
        },
        x_key: {
          type: "string",
          description: "Klíč pro osu X (kategorie/čas), např. 'měsíc', 'makléř', 'lokalita'",
        },
        y_key: {
          type: "string",
          description: "Klíč pro osu Y (hodnota), např. 'počet', 'cena_m2', 'budget'",
        },
        horizontal: {
          type: "boolean",
          description: "true = horizontální bar chart (labely vlevo, sloupce doprava). Použij pro dlouhé labely nebo >8 položek.",
        },
        reference_line: {
          type: "object",
          description: "Zobrazí referenční čáru (průměr, medián...). Např. { value: 37000, label: 'Průměr okresu ~37k' }",
          properties: {
            value: { type: "number" },
            label: { type: "string" },
          },
        },
        color_legend: {
          type: "array",
          description: "Legenda pro barevné zóny. Každá položka: { color: 'green'|'yellow'|'red'|'blue'|'gray', label: string }",
          items: {
            type: "object",
            properties: {
              color: { type: "string" },
              label: { type: "string" },
            },
          },
        },
      },
      required: ["type", "data", "title"],
    },
  },
];
