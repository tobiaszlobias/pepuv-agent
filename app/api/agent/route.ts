import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { agentTools } from "@/lib/tools/definitions";
import { getClients, getProperties, getLeads } from "@/lib/sheets";
import { searchByAddress, searchByParcel } from "@/lib/cuzk";
import { scrapeSreality } from "@/lib/apify";

const client = new Anthropic();

const SYSTEM_PROMPT = `Jsi Back Office Operations Agent pro realitní firmu. Pomáháš Pepovi — back office managerovi — s každodenní prací.

Mluvíš česky. Jsi profesionální, stručný a konkrétní.

Dostupné termíny prohlídek (kalendář Pepa):
- Pondělí: 10:00, 14:00
- Středa: 9:00, 14:00, 16:00
- Pátek: 10:00, 13:00

---

## PEVNÉ ŠABLONY — vždy dodržuj tuto strukturu

Pro každý typ dotazu existuje pevná šablona. Drž se jí — neupravuj strukturu, jen plň daty.
Vlastní strukturu vymýšlej POUZE pokud dotaz nespadá do žádné šablony.

### ŠABLONA: Trend leadů / klientů / nemovitostí v čase
Dotaz: "Ukáž vývoj leadů", "Trend klientů", "Jak se vyvíjely leady"
1. Zavolej get_leads(months: N) nebo get_clients() nebo get_properties()
2. Agreguj data po měsících (počty)
3. Zavolej create_chart(type: "line", title: "Vývoj [entity] za posledních N měsíců", data: [{name: "Led", value: X}, ...], x_key: "name", y_key: "value")
4. Text odpovědi: 2-3 věty shrnutí trendu (peak, průměr, trend nahoru/dolů). Žádné varování o prázdné databázi pokud jsou alespoň 2 datové body.

### ŠABLONA: Přehled klientů / nemovitostí / leadů
Dotaz: "Noví klienti Q1", "Jaké nemovitosti máme", "Leady tento měsíc"
1. Zavolej příslušný get_* nástroj s filtry
2. Text: stručná tabulka nebo výčet v markdown. Max 10 položek, pak "...a X dalších."
3. Pokud má smysl vizualizace (distribuce, srovnání), zavolej create_chart.

### ŠABLONA: Email klientovi
Dotaz: "Napiš email", "Email zájemci", "Navrhni termín"
1. Zavolej draft_email(client_name, property_address, available_slots)
2. Text: hotový email v bloku — formát:
   **Předmět:** ...

   Dobrý den [jméno],
   [tělo emailu — 3-4 věty, profesionální tón]
   Nabízím tyto termíny prohlídky:
   - [termín 1]
   - [termín 2]
   - [termín 3]
   S pozdravem, Pepa

### ŠABLONA: Nemovitosti s chybějícími daty
Dotaz: "Chybějící data", "Nemovitosti bez rekonstrukce", "Co chybí v databázi"
1. Zavolej get_properties(missing_field: "rok_rekonstrukce") nebo podle kontextu
2. Text: tabulka v markdown — sloupce: Adresa | Typ | Cena | Co chybí
3. Závěr: "Celkem X nemovitostí vyžaduje doplnění dat."

### ŠABLONA: Týdenní report
Dotaz: "Shrň výsledky", "Týdenní report", "Co se dělo minulý týden"
1. Zavolej generate_report(week: "aktuální/minulý")
2. Slidy se zobrazí automaticky — NEPIŠ jejich obsah znovu do textu
3. Text odpovědi: pouze 1 věta úvodu, např. "Tady je report za minulý týden:"

### ŠABLONA: Monitoring Sreality
Dotaz: "Nové nabídky", "Co je na Sreality", "Monitoring Praha"
1. Zavolej search_sreality(locality, property_type?, max_price?)
2. Text: tabulka — Adresa | Typ | Cena | Odkaz (pokud dostupný)
3. Závěr: "Nalezeno X nabídek v [lokalitě]."

### ŠABLONA: Dotaz na makléře / výkon
Dotaz: "Kdo má nejvíc leadů", "Výkon makléřů", "Srovnání makléřů"
1. Zavolej get_leads() nebo get_clients()
2. Agreguj podle makléře
3. create_chart(type: "bar", horizontal: true, data seřazená sestupně, color zóny: green/yellow/red podle výkonu)
4. Text: top 3 makléři + stručný komentář.

---

## Pravidla pro grafy (create_chart)

**Výběr typu:**
- "pie" — distribuce/podíly celku (zdroje klientů, typy nemovitostí, statusy). Max 6 kategorií.
- "line" — vývoj v čase (leady po měsících, trendy). X osa musí být časové období.
- "bar" — porovnání hodnot (makléři, lokality, ceny). Pro vše ostatní.

**Orientace bar chartu:**
- horizontal: false — vertikální sloupce, pro ≤8 položek s krátkými labely
- horizontal: true — pro >8 položek NEBO labely delší než ~15 znaků

**Příprava dat:**
- Data VŽDY seřaď sestupně podle hodnoty
- Omez na max 15 položek
- Labely zkracej — "Praha Holešovice 3+kk 75m²" → "Holešovice 3+kk 75m²"

**Barevné zóny (pole "color"):**
- "green" — výborné/pod průměrem
- "yellow" — průměrné/v normě
- "red" — drahé/nad průměrem/problematické
- "gray" — outlier, nelze srovnávat
Pro pie a line chart color zóny nepoužívej.
Pokud použiješ color zóny, přidej i "color_legend".
Pokud má smysl průměrová čára, přidej "reference_line".`;

type MessageParam = Anthropic.MessageParam;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Executor pro jednotlivé nástroje
async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "get_clients": {
        const data = await getClients(input as Parameters<typeof getClients>[0]);
        return JSON.stringify({
          success: true,
          count: data.length,
          clients: data,
        });
      }

      case "get_properties": {
        const data = await getProperties(
          input as Parameters<typeof getProperties>[0]
        );
        return JSON.stringify({
          success: true,
          count: data.length,
          properties: data,
        });
      }

      case "get_leads": {
        const data = await getLeads(input as Parameters<typeof getLeads>[0]);
        return JSON.stringify({
          success: true,
          count: data.length,
          leads: data,
        });
      }

      case "search_cuzk": {
        const { address, parcel_number, cadastral_area } = input as {
          address?: string;
          parcel_number?: string;
          cadastral_area?: string;
        };

        if (!process.env.CUZK_API_KEY) {
          return JSON.stringify({
            success: false,
            error: "ČÚZK API klíč není nakonfigurován",
          });
        }

        if (address) {
          const data = await searchByAddress(address);
          return JSON.stringify({ success: true, source: "ČÚZK", data });
        }
        if (parcel_number) {
          const data = await searchByParcel(parcel_number, cadastral_area);
          return JSON.stringify({ success: true, source: "ČÚZK", data });
        }
        return JSON.stringify({
          success: false,
          error: "Zadej adresu nebo parcelní číslo",
        });
      }

      case "search_sreality": {
        if (!process.env.APIFY_API_TOKEN) {
          return JSON.stringify({
            success: false,
            error: "Apify token není nakonfigurován",
          });
        }
        const data = await scrapeSreality(
          input as Parameters<typeof scrapeSreality>[0]
        );
        return JSON.stringify({
          success: true,
          count: data.length,
          listings: data,
        });
      }

      case "draft_email": {
        const { client_name, property_address, available_slots, email_type } =
          input as {
            client_name: string;
            property_address: string;
            available_slots?: string[];
            email_type?: string;
          };

        const slots =
          available_slots ||
          ["středa 14:00", "pátek 10:00", "pondělí 10:00"];

        return JSON.stringify({
          success: true,
          email_draft: {
            client: client_name,
            property: property_address,
            type: email_type || "prohlídka",
            suggested_slots: slots,
            template_ready: true,
          },
        });
      }

      case "generate_report": {
        const { week } = input as { week: string; include_charts?: boolean };

        // Mock report data — v produkci by se tahalo ze Sheets
        const reportData = {
          success: true,
          week,
          slides: [
            {
              title: "Přehled leadů",
              subtitle: `Týden ${week}`,
              metrics: [
                { label: "Nové leady", value: 12, change: "+3" },
                { label: "Kontaktováno", value: 8, change: "+1" },
                { label: "Prohlídky", value: 4, change: "0" },
                { label: "Uzavřeno", value: 2, change: "+1" },
              ],
            },
            {
              title: "Nemovitosti",
              subtitle: "Aktuální portfolio",
              metrics: [
                { label: "K prodeji", value: 23, change: "-2" },
                { label: "Rezervováno", value: 5, change: "+2" },
                { label: "Prodáno tento týden", value: 2, change: "+2" },
                { label: "Průměrná cena", value: "8,5M Kč", change: "" },
              ],
            },
            {
              title: "Výsledky týdne",
              subtitle: "Shrnutí a next steps",
              highlights: [
                "Uzavřeny 2 obchody: Holešovická 15, Mánesova 8",
                "Nový lead z Sreality — zájemce o 3+kk Praha 7",
                "3 nemovitosti přidány do portfolia",
              ],
              next_steps: [
                "Follow-up s 5 klienty ve fázi nabídky",
                "Doplnit data o rekonstrukci u 7 nemovitostí",
                "Ranní monitoring Sreality — Praha Holešovice",
              ],
            },
          ],
        };

        return JSON.stringify(reportData);
      }

      case "create_chart": {
        const { type, data, title, x_key, y_key, horizontal, reference_line, color_legend } = input as {
          type: "bar" | "line" | "pie";
          data: { items: Record<string, unknown>[] };
          title: string;
          x_key?: string;
          y_key?: string;
          horizontal?: boolean;
          reference_line?: { value: number; label: string };
          color_legend?: { color: string; label: string }[];
        };

        const resolvedYKey = y_key || "value";
        const rawItems: Record<string, unknown>[] = data.items || (data as unknown as Record<string, unknown>[]);

        // Sort ascending by value so lowest (best value) appears first / at top in horizontal charts
        const sortedItems = [...rawItems].sort(
          (a, b) => Number(a[resolvedYKey] ?? 0) - Number(b[resolvedYKey] ?? 0)
        );

        return JSON.stringify({
          success: true,
          chart: {
            type,
            title,
            data: sortedItems,
            x_key: x_key || "name",
            y_key: resolvedYKey,
            horizontal: horizontal ?? false,
            ...(reference_line ? { reference_line } : {}),
            ...(color_legend ? { color_legend } : {}),
          },
        });
      }

      default:
        return JSON.stringify({ error: `Neznámý nástroj: ${name}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: message });
  }
}

export async function POST(req: NextRequest) {
  const { messages, model }: { messages: ChatMessage[]; model?: string } = await req.json();
  const selectedModel = model || "claude-sonnet-4-6";

  const apiMessages: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Tool use loop
  const allMessages: MessageParam[] = [...apiMessages];

  let response = await client.messages.create({
    model: selectedModel,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: agentTools,
    messages: allMessages,
  });

  // Loop dokud Claude vrací tool_use bloky
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    allMessages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: await executeTool(
          block.name,
          block.input as Record<string, unknown>
        ),
      }))
    );

    allMessages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: selectedModel,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: agentTools,
      messages: allMessages,
    });
  }

  // Extrahuj finální text
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );

  // Hledej chart data v posledních tool výsledcích
  const chartData = allMessages
    .flatMap((m) => (Array.isArray(m.content) ? m.content : []))
    .filter(
      (b): b is Anthropic.ToolResultBlockParam =>
        typeof b === "object" && "tool_use_id" in b
    )
    .map((b) => {
      try {
        const parsed = JSON.parse(b.content as string);
        return parsed.chart || null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Hledej slide data
  const slideData = allMessages
    .flatMap((m) => (Array.isArray(m.content) ? m.content : []))
    .filter(
      (b): b is Anthropic.ToolResultBlockParam =>
        typeof b === "object" && "tool_use_id" in b
    )
    .map((b) => {
      try {
        const parsed = JSON.parse(b.content as string);
        return parsed.slides || null;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .flat();

  return NextResponse.json({
    text: textBlock?.text || "",
    charts: chartData,
    slides: slideData,
  });
}
