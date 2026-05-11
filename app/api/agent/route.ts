import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { agentTools } from "@/lib/tools/definitions";
import { getClients, getProperties, getLeads } from "@/lib/sheets";
import { searchByAddress, searchByParcel } from "@/lib/cuzk";
import { scrapeSreality } from "@/lib/apify";

const client = new Anthropic();

const SYSTEM_PROMPT = `Jsi Back Office Operations Agent pro realitní firmu. Pomáháš Pepovi — back office managerovi — s každodenní prací.

Mluvíš česky. Jsi profesionální, stručný a konkrétní.

Umíš:
- Analyzovat data klientů, nemovitostí a leadů z interní databáze
- Vyhledávat v Katastru nemovitostí (ČÚZK)
- Sledovat nabídky na Sreality
- Navrhovat emaily klientům s termíny prohlídek
- Generovat týdenní reporty a prezentace
- Vytvářet grafy a vizualizace dat

Dostupné termíny prohlídek (mock kalendář Pepa):
- Pondělí: 10:00, 14:00
- Středa: 9:00, 14:00, 16:00
- Pátek: 10:00, 13:00

Pokud chceš zobrazit data graficky, vždy zavolej nástroj create_chart s relevantními daty.
Pokud generuješ report, zavolej generate_report a vrátí ti strukturu pro 3 slidy.`;

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
        const { type, data, title, x_key, y_key } = input as {
          type: "bar" | "line" | "pie";
          data: { items: Record<string, unknown>[] };
          title: string;
          x_key?: string;
          y_key?: string;
        };

        return JSON.stringify({
          success: true,
          chart: {
            type,
            title,
            data: data.items || data,
            x_key: x_key || "name",
            y_key: y_key || "value",
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
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const apiMessages: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Tool use loop
  const allMessages: MessageParam[] = [...apiMessages];

  let response = await client.messages.create({
    model: "claude-sonnet-4-6",
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
      model: "claude-sonnet-4-6",
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
