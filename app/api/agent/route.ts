import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { agentTools } from "@/lib/tools/definitions";
import { getClients, getProperties, getLeads } from "@/lib/sheets";
import { searchByAddress, searchByParcel, searchBuilding } from "@/lib/cuzk";
import { scrapeSreality } from "@/lib/apify";
import { getUpcomingEvents, getFreeSlotsForNextDays, createCalendarEvent } from "@/lib/calendar";

const client = new Anthropic();

const SYSTEM_PROMPT = `Jsi Back Office Operations Agent pro realitní firmu. Pomáháš Pepovi — back office managerovi — s každodenní prací.

Mluvíš česky. Jsi profesionální, stručný a konkrétní.

Máš přístup k Pepovu Google Kalendáři přes nástroje get_calendar_events a find_free_slots. Vždy je používej pro dotazy na dostupnost a termíny — nepoužívej pevně zadané časy.

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
1. NEJDŘÍV zavolej find_free_slots() — získej reálné volné termíny z Pepova kalendáře
2. Zavolej draft_email(client_name, property_address, available_slots: [první 3 volné sloty z kalendáře])
3. Text: hotový email v bloku — formát:
   **Předmět:** ...

   Dobrý den [jméno],
   [tělo emailu — 3-4 věty, profesionální tón]
   Nabízím tyto termíny prohlídky (dle mého kalendáře):
   - [termín 1 z kalendáře]
   - [termín 2 z kalendáře]
   - [termín 3 z kalendáře]
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
2. Text: tabulka v markdown — sloupce: Adresa | Typ | Cena | Odkaz
   - Odkaz VŽDY zobraz jako markdown link: [Sreality](url) — každý řádek musí mít odkaz
   - Pokud url chybí nebo je prázdné, napiš "—"
3. Závěr: "Nalezeno X nabídek v [lokalitě]."

### ŠABLONA: Nabídky Sreality + ověření v ČÚZK
Dotaz: "Ukáž nabídky v X a ověř v katastru", "Zkontroluj katastr pro nabídky", "Co je na Sreality a jak to stojí v katastru"
1. Zavolej search_sreality(locality, property_type?)
2. Z vrácených nabídek vyber max 2 kde adresa obsahuje číslo (např. "Komunardů 32" → č.p. 32)
   - Pokud žádná adresa číslo neobsahuje, uveď "číslo popisné neznámé — ČÚZK nelze ověřit" a přeskoč krok 3-4
3. Pro každou vybranou: zavolej search_cuzk(cislo_domovni: X, kod_casti_obce: Y)
   - Kódy: Holešovice=490067, Vinohrady=490229, Žižkov=490261, Smíchov=400301, Dejvice=400459, Karlín=400637
   - NIKDY více než 2 volání ČÚZK na jeden dotaz (API limit)
4. Výstup:
   ## Nabídky — [lokalita]
   | Adresa | Typ | Cena | Odkaz |
   (všechny Sreality nabídky)

   ## Katastrální ověření
   ### [adresa]
   - **Typ stavby:** [zpusobVyuziti]
   - **Památková ochrana:** [zpusobyOchrany nebo "bez ochrany"]
   - **Počet jednotek v domě:** [pocetJednotek]
   - **Právní řízení:** [pokud maRizeni: "⚠️ POZOR — aktivní řízení!" jinak "čisté, bez plomb"]
   - **List vlastnictví:** LV [lv.cislo], k.ú. [lv.katastralniUzemi]

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
        const { address, parcel_number, cadastral_area, cislo_domovni, kod_casti_obce } = input as {
          address?: string;
          parcel_number?: string;
          cadastral_area?: string;
          cislo_domovni?: number;
          kod_casti_obce?: number;
        };

        if (!process.env.CUZK_API_KEY) {
          return JSON.stringify({
            success: false,
            error: "ČÚZK API klíč není nakonfigurován",
          });
        }

        if (cislo_domovni && kod_casti_obce) {
          const data = await searchBuilding(cislo_domovni, kod_casti_obce);
          if (!data) {
            return JSON.stringify({
              success: false,
              error: `Budova č.p. ${cislo_domovni} v části obce ${kod_casti_obce} nebyla v ČÚZK nalezena.`,
            });
          }
          return JSON.stringify({ success: true, source: "ČÚZK", data });
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
          error: "Zadej cislo_domovni + kod_casti_obce, adresu nebo parcelní číslo.",
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

      case "get_calendar_events": {
        const { days: calDays } = input as { days?: number };
        try {
          const events = await getUpcomingEvents(calDays ?? 7);
          return JSON.stringify({ success: true, count: events.length, events });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ success: false, error: `Kalendář nedostupný: ${msg}`, events: [] });
        }
      }

      case "find_free_slots": {
        const { days: slotDays } = input as { days?: number };
        try {
          const available = await getFreeSlotsForNextDays(slotDays ?? 5);
          const allSlots = available.flatMap((d) => d.slots.map((s) => s.label));
          return JSON.stringify({ success: true, available, all_slot_labels: allSlots });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Fallback to static slots if calendar unavailable
          return JSON.stringify({
            success: false,
            error: `Kalendář nedostupný: ${msg}`,
            all_slot_labels: ["pondělí 10:00–11:00", "středa 14:00–15:00", "pátek 10:00–11:00"],
          });
        }
      }

      case "create_calendar_event": {
        const { title: evTitle, date: evDate, start: evStart, end: evEnd, description: evDesc } = input as {
          title: string;
          date: string;
          start: string;
          end: string;
          description?: string;
        };
        try {
          const result = await createCalendarEvent(evTitle, evDate, evStart, evEnd, evDesc);
          return JSON.stringify({ success: true, ...result, message: `Událost "${evTitle}" byla přidána do kalendáře.` });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return JSON.stringify({ success: false, error: `Nepodařilo se vytvořit událost: ${msg}` });
        }
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

        const [allLeads, allProperties, allClients] = await Promise.all([
          getLeads(),
          getProperties(),
          getClients(),
        ]);

        const now = new Date();
        const isLastWeek = week.toLowerCase().includes("minul");
        const weekOffset = isLastWeek ? 1 : 0;

        // Určí začátek a konec cílového týdne
        const weekStart = new Date(now);
        const day = weekStart.getDay() || 7;
        weekStart.setDate(weekStart.getDate() - day + 1 - weekOffset * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Předchozí týden pro výpočet change
        const prevStart = new Date(weekStart);
        prevStart.setDate(prevStart.getDate() - 7);
        const prevEnd = new Date(weekEnd);
        prevEnd.setDate(prevEnd.getDate() - 7);

        function inRange(dateStr: string, from: Date, to: Date) {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return d >= from && d <= to;
        }

        function sign(n: number) {
          if (n > 0) return `+${n}`;
          if (n < 0) return String(n);
          return "0";
        }

        // Leady
        const leadsThisWeek = allLeads.filter((l) => inRange(l.datum, weekStart, weekEnd));
        const leadsPrevWeek = allLeads.filter((l) => inRange(l.datum, prevStart, prevEnd));
        const leadsNew = leadsThisWeek.length;
        const leadsNewPrev = leadsPrevWeek.length;
        const leadsKontaktovan = allLeads.filter((l) => l.status.toLowerCase().includes("kontaktov")).length;
        const leadsProhlidka = allLeads.filter((l) => l.status.toLowerCase().includes("prohl")).length;
        const leadsUzavren = allLeads.filter((l) => inRange(l.datum, weekStart, weekEnd) && l.status.toLowerCase().includes("uzavř")).length;
        const leadsUzavrenPrev = allLeads.filter((l) => inRange(l.datum, prevStart, prevEnd) && l.status.toLowerCase().includes("uzavř")).length;

        // Nemovitosti
        const propForSale = allProperties.filter((p) => p.stav.toLowerCase().includes("prodej") || p.stav.toLowerCase().includes("nabídka")).length;
        const propReserved = allProperties.filter((p) => p.stav.toLowerCase().includes("rezerv")).length;
        const propSoldThisWeek = allProperties.filter((p) => inRange(p.datum_pridani, weekStart, weekEnd) && p.stav.toLowerCase().includes("prodáno")).length;
        const propSoldPrev = allProperties.filter((p) => inRange(p.datum_pridani, prevStart, prevEnd) && p.stav.toLowerCase().includes("prodáno")).length;
        const propMissingRek = allProperties.filter((p) => !p.rok_rekonstrukce || p.rok_rekonstrukce === "").length;
        const prices = allProperties.map((p) => parseInt(p.cena.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n) && n > 0);
        const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
        const avgPriceM = avgPrice > 0 ? `${(avgPrice / 1_000_000).toFixed(1)} M Kč` : "—";

        // Klienti
        const clientsNew = allClients.filter((c) => inRange(c.datum_pridani, weekStart, weekEnd)).length;
        const clientsNewPrev = allClients.filter((c) => inRange(c.datum_pridani, prevStart, prevEnd)).length;

        // Top makléř
        const maklerCounts: Record<string, number> = {};
        allLeads.forEach((l) => { if (l.makler) maklerCounts[l.makler] = (maklerCounts[l.makler] || 0) + 1; });
        const topMakler = Object.entries(maklerCounts).sort((a, b) => b[1] - a[1])[0];

        // Next steps dynamicky
        const nextSteps: string[] = [];
        const leadsNabidka = allLeads.filter((l) => l.status.toLowerCase().includes("nabídka")).length;
        if (leadsNabidka > 0) nextSteps.push(`Follow-up s ${leadsNabidka} klienty ve fázi nabídky`);
        if (propMissingRek > 0) nextSteps.push(`Doplnit data o rekonstrukci u ${propMissingRek} nemovitostí`);
        nextSteps.push("Ranní monitoring Sreality — Praha Holešovice");

        const weekLabel = `${weekStart.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })} – ${weekEnd.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })}`;

        const reportData = {
          success: true,
          week,
          slides: [
            {
              title: "Přehled leadů",
              subtitle: weekLabel,
              metrics: [
                { label: "Nové leady tento týden", value: leadsNew, change: sign(leadsNew - leadsNewPrev) },
                { label: "Kontaktováno (celkem)", value: leadsKontaktovan, change: "" },
                { label: "Prohlídky (celkem)", value: leadsProhlidka, change: "" },
                { label: "Uzavřeno tento týden", value: leadsUzavren, change: sign(leadsUzavren - leadsUzavrenPrev) },
              ],
            },
            {
              title: "Nemovitosti",
              subtitle: "Aktuální portfolio",
              metrics: [
                { label: "K prodeji", value: propForSale, change: "" },
                { label: "Rezervováno", value: propReserved, change: "" },
                { label: "Prodáno tento týden", value: propSoldThisWeek, change: sign(propSoldThisWeek - propSoldPrev) },
                { label: "Průměrná cena", value: avgPriceM, change: "" },
              ],
            },
            {
              title: "Výsledky týdne",
              subtitle: "Shrnutí a next steps",
              highlights: [
                `${leadsNew} nových leadů tento týden (${sign(leadsNew - leadsNewPrev)} vs. předchozí)`,
                `${clientsNew} nových klientů (${sign(clientsNew - clientsNewPrev)} vs. předchozí týden)`,
                topMakler ? `Top makléř: ${topMakler[0]} — ${topMakler[1]} leadů celkem` : "Data o makléřích nejsou k dispozici",
              ],
              next_steps: nextSteps,
            },
          ],
        };

        return JSON.stringify(reportData);
      }

      case "create_chart": {
        const { type, data, title, x_key, y_key, horizontal, reference_line, color_legend, unit } = input as {
          type: "bar" | "line" | "pie";
          data: { items: Record<string, unknown>[] };
          title: string;
          x_key?: string;
          y_key?: string;
          horizontal?: boolean;
          unit?: string;
          reference_line?: { value: number; label: string };
          color_legend?: { color: string; label: string }[];
        };

        const resolvedYKey = y_key || "value";
        const rawItems: Record<string, unknown>[] = data.items || (data as unknown as Record<string, unknown>[]);

        // Horizontal bar: sort ascending so cheapest appears at top (Recharts renders first item at top)
        // Vertical bar / pie / line: sort descending (highest value first)
        const isHoriz = horizontal ?? false;
        const sortedItems = [...rawItems].sort((a, b) =>
          isHoriz
            ? Number(a[resolvedYKey] ?? 0) - Number(b[resolvedYKey] ?? 0)
            : Number(b[resolvedYKey] ?? 0) - Number(a[resolvedYKey] ?? 0)
        );

        // Strip any "label" field Claude may add — labels are rendered by axis/tooltip only
        const cleanedItems = sortedItems.map(({ label: _label, ...rest }) => rest as Record<string, unknown>);

        // Debug: log raw price values to Vercel function logs
        if (isHoriz && cleanedItems.length > 0) {
          console.log("[create_chart] raw prices sample:", cleanedItems.slice(0, 3).map(d => ({ val: d[resolvedYKey], type: typeof d[resolvedYKey] })));
        }

        // Normalize price values: parse strings, convert M Kč → Kč, produce canonical Kč numbers
        function toKc(raw: unknown): number {
          if (raw === null || raw === undefined) return 0;
          const s = String(raw).replace(/\s/g, "").replace("Kč", "").replace("MKč", "").trim();
          const n = parseFloat(s);
          if (isNaN(n)) return 0;
          // If value ≤ 500 it's already in millions (e.g. Claude passed 9.5 meaning 9.5M)
          return n <= 500 ? n * 1_000_000 : n;
        }

        const vals = cleanedItems.map((d) => toKc(d[resolvedYKey])).filter((n) => n > 0);
        const isMKc = vals.length > 0 && vals.every((v) => v >= 1_000_000) &&
          cleanedItems.every((d) => Number(d[resolvedYKey] ?? 0) <= 500);

        // Detect if Claude passed color zones (any item has color field, or color_legend provided)
        const hasColorZones = color_legend != null || cleanedItems.some((d) => d.color);

        // Apply color zones for ALL bar charts (horizontal and vertical) when color zones are used
        const itemsWithColor = (type === "bar" && hasColorZones)
          ? cleanedItems.map((item) => {
              // If item already has a valid color zone, keep it; otherwise derive from value
              const existing = item.color as string | undefined;
              if (existing && ["green", "yellow", "red", "blue", "gray"].includes(existing)) {
                return item;
              }
              // Derive from value — works for both price (Kč/M Kč) and arbitrary scales
              const val = Number(item[resolvedYKey] ?? 0);
              const valKc = toKc(item[resolvedYKey]);
              // Use Kč thresholds if values look like prices, otherwise use relative thirds
              let color: string;
              if (vals.some((v) => v >= 100_000)) {
                color = valKc < 6_000_000 ? "green" : valKc < 12_000_000 ? "yellow" : "red";
              } else {
                // Generic: sort-based coloring — bottom third green, middle yellow, top red
                const sorted = [...vals].sort((a, b) => a - b);
                const lo = sorted[Math.floor(sorted.length / 3)];
                const hi = sorted[Math.floor((sorted.length * 2) / 3)];
                color = val <= lo ? "green" : val <= hi ? "yellow" : "red";
              }
              return { ...item, color };
            })
          : cleanedItems;

        const xKey = x_key || "name";

        // Auto-detect unit for M Kč axis formatting
        const autoUnit = unit || (isHoriz && isMKc ? "M Kč" : undefined);

        return JSON.stringify({
          success: true,
          chart: {
            type,
            title,
            data: itemsWithColor,
            x_key: xKey,
            y_key: resolvedYKey,
            horizontal: isHoriz,
            ...(autoUnit ? { unit: autoUnit } : {}),
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
  const MAX_ITERATIONS = 8;
  let iterations = 0;

  let response = await client.messages.create({
    model: selectedModel,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: agentTools,
    messages: allMessages,
  });

  // Loop dokud Claude vrací tool_use bloky
  while (response.stop_reason === "tool_use" && iterations < MAX_ITERATIONS) {
    iterations++;
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
