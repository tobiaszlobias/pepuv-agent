# Back Office Operations Agent — CLAUDE.md

## Pravidla pro Claude Code

- **Vždy commituj a pushuj** po dokončení změn — bez ptaní
- **Průběžně aktualizuj tento soubor** když se změní architektura, stav projektu, nebo přijdou nové důležité informace
- TypeScript vždy, žádný `any`
- Tailwind pro styling

---

## Kontext projektu

Odpověď na výzvu od Vojtova týmu (Vojta Žižka). Cílem je postavit Back Office Operations Agenta pro firmu spravující nemovitosti. Agent má převzít část práce back office managera Pepy — shromažďovat data z různých zdrojů, odpovídat na dotazy, generovat reporty, navrhovat emaily a monitorovat trh.

Pepa je fiktivní postava ze zadání — reprezentuje back office managera realitní firmy.

**Deadline:** 16. 5. 2026  
**Odevzdání:** odkaz na UI nasazené na Vercelu + krátké video  
**Live URL:** https://pepuv-agent.vercel.app  
**GitHub:** https://github.com/tobiaszlobias/pepuv-agent

---

## Aktuální stav (16. 5. 2026)

✅ Všech 6 use cases ze zadání funguje na live deploymentu  
✅ Google Sheets data naseedována (50 klientů, 50 nemovitostí, 50 leadů)  
✅ Dark mode + light mode toggle (výchozí: tmavý, perzistuje přes reload)  
✅ react-markdown + remark-gfm (tabulky, bold, headings)  
✅ ErrorBoundary kolem grafů a slidů  
✅ Cycling loading text ("Načítám data...", "Volám nástroje..."...)  
✅ Sreality — přímé volání Sreality public API (nahrazeno Apify)  
✅ Redesign UI — Syne + Inter fonty, žlutá hero barva (#FFD600), CSS custom properties  
✅ **Bez hesla** — LoginScreen odstraněn, aplikace přístupná přímo  
✅ Sidebar stránky: Klienti, Nemovitosti, Leady (tabulky z Sheets, search, cache)  
✅ SessionStorage persistence — aktivní stránka, dark mode, chat history, vybraný model  
✅ Dashboard — KPI cards, area chart + timeslot picker (3m/6m/12m/Vše), pie chart, Sreality panel  
✅ Tabulky — formátované ceny (8 M Kč), datum (cs-CZ), status/stav color badges  
✅ AgentChart — bar/line/pie, AreaChart s gradientem, color zones, reference line  
✅ SVG nav ikony (bez emoji), user-select: none na dashboardu  
✅ Mobilní layout — bottom nav, responzivní dashboard grid, h-[100dvh]  
✅ KPI cards count-up animace (ease-out cubic, 900ms) při prvním loadu  
✅ Area chart animace při změně timeslotu (key={timeSlot}, 500ms ease-out)  
✅ Dashboard chart: české zkratky měsíců (led/úno/bře...), správný počet měsíců v timeslotu  
✅ Makléři progress bary + podíl %, uzavřeno celkem  
✅ ReportSlides redesign — CSS vars, žlutá, bez indigo  
✅ Systémový prompt s pevnými šablonami pro known query types  
✅ Model picker — Haiku/Sonnet/Opus, persistuje přes reload  
✅ Per-model timeout — Haiku 45s, Sonnet 90s, Opus 150s  
✅ Quick prompts — grid karet v prázdném chatu, chips bar po první zprávě  
✅ QUICK_PROMPTS centralizovány v `lib/constants.ts`  
✅ DataTable card layout na mobilu — žádný horizontální scroll  
✅ User avatar v chatu — prasepepa.png  
✅ Sidebar/header výška srovnána (65px)  
✅ Google Calendar integrace — get_calendar_events, find_free_slots, create_calendar_event  
✅ Email šablona používá reálné sloty z kalendáře  
✅ Light mode gradient zesílen  
✅ Inline inputs v monitoring panelu nerozskakují layout (size attr místo minWidth)  

**Zbývá:** Natočit demo video

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **AI:** Claude API (`claude-sonnet-4-6`) — tool use loop, model volitelný uživatelem
- **Interní data:** Google Sheets (googleapis) — service account auth
- **Katastr:** ČÚZK REST API (`api-kn.cuzk.gov.cz`) — server-side only
- **Monitoring trhu:** Sreality public API — přímé volání server-side, `lib/apify.ts` zachováno jako název
- **Grafy:** Recharts (bar, line/area, pie) — inline v chatu i na dashboardu
- **Markdown:** react-markdown + remark-gfm
- **Nasazení:** Vercel + Vercel Cron (ranní monitoring 7:00 UTC)

---

## Environment Variables

```
ANTHROPIC_API_KEY=        ← Claude API klíč
CUZK_API_KEY=             ← ČÚZK REST API klíč (500 volání/den)
GOOGLE_SHEETS_ID=         ← ID Google Sheetu
GOOGLE_SERVICE_ACCOUNT=   ← Google service account JSON (base64)
APIFY_API_TOKEN=          ← Apify token (zachováno, ale nepoužívá se)
GOOGLE_CALENDAR_ID=       ← ID Google Kalendáře (Pepa - Pracovní kalendář)
```

> `PASSWORD` env je stále přítomná v `/api/auth/route.ts`, ale LoginScreen je odstraněn z UI — autentizace není aktivní.

---

## 6 požadavků ze zadání (všechny splněny)

1. **Dotazy nad daty + grafy** — klienti, nemovitosti, leady ze Sheets + Recharts
2. **Trend grafy** — vývoj leadů/prodejů za posledních N měsíců
3. **Email asistent** — draft s reálnými sloty z Google Kalendáře
4. **Chybějící data** — nemovitosti bez roku rekonstrukce
5. **Týdenní report + slidy** — 3 styled React slide komponenty v chatu
6. **Monitoring trhu** — Sreality přes přímé API, Vercel Cron každé ráno v 7:00 UTC

---

## Architektura

```
/app
  /api
    /agent/route.ts            ← hlavní API route, Claude tool use loop
    /auth/route.ts             ← POST ověření hesla (env PASSWORD) — nepoužívá se
    /cron/route.ts             ← Vercel Cron — ranní monitoring Sreality
    /calendar/route.ts         ← GET upcoming/free_slots/free_slots_week, POST create event
    /dashboard/route.ts        ← GET agregovaná data pro Dashboard
    /sreality/scan/route.ts    ← GET scan Sreality pro monitoring panel
    /sheets/
      clients/route.ts         ← GET všichni klienti
      properties/route.ts      ← GET všechny nemovitosti
      leads/route.ts           ← GET všechny leady
  /components
    /chat/
      MessageList.tsx          ← react-markdown, welcome grid promptů, ErrorBoundary
      ChatInput.tsx            ← textarea, chips bar, model picker
    /charts/
      AgentChart.tsx           ← Recharts wrapper (bar/area/pie), dark mode
    /slides/
      ReportSlides.tsx         ← 3 slide komponenty, CSS vars
    /views/
      ClientsView.tsx          ← tabulka klientů, search, cache
      PropertiesView.tsx       ← tabulka nemovitostí, search, cache
      LeadsView.tsx            ← tabulka leadů, search, cache
      DashboardView.tsx        ← KPI, area chart, pie, monitoring panel, makléři
    DataTable.tsx              ← sdílená tabulka, card layout na mobilu
    ErrorBoundary.tsx          ← React class component, fallback UI
    listings/ListingsTable.tsx ← tabulka Sreality nabídek s ČÚZK statusem
/lib
  constants.ts                 ← QUICK_PROMPTS, MODEL_TIMEOUTS — jediný zdroj pravdy
  tools/definitions.ts         ← JSON schema pro nástroje Claudea
  sheets.ts                    ← Google Sheets helper (getClients/Properties/Leads)
  cache.ts                     ← in-memory + sessionStorage cache (getCached/setCached)
  calendar.ts                  ← Google Calendar (getUpcomingEvents, findFreeSlots, createCalendarEvent)
  cuzk.ts                      ← ČÚZK API (searchByAddress, searchByParcel)
  apify.ts                     ← Sreality přímé API (název zachován z historických důvodů)
/scripts
  seed-sheets.ts               ← seed skript, valueInputOption: "RAW"
  create-calendar.ts           ← vytvoří Google Kalendář, vypíše ID
  share-calendar.ts            ← sdílí kalendář s emailem
  seed-calendar.ts             ← naplní kalendář ~30 realistickými událostmi
```

### Tool use loop

1. Uživatel napíše dotaz
2. POST `/api/agent` → Claude dostane dotaz + nástroje + systémový prompt
3. Claude volá nástroje (loop dokud `stop_reason !== "tool_use"`)
4. Výsledky nástrojů zpět Claudovi
5. Finální odpověď → `{ text, charts[], slides[], listings? }`
6. Frontend renderuje markdown, grafy (AreaChart s gradientem), slidy, listings tabulku

---

## Nástroje agenta (11 celkem)

```typescript
get_clients(quarter?, year?, source?)
get_properties(status?, type?, missing_field?)
get_leads(months?, source?)
search_cuzk(address?, parcel_number?, cadastral_area?)
search_sreality(locality, property_type?, max_price?)
draft_email(client_name, property_address, available_slots?)
generate_report(week)
create_chart(type: 'bar'|'line'|'pie', data, title, x_key?, y_key?)
get_calendar_events(days?)
find_free_slots(days?)
create_calendar_event(title, date, start, end, description?)
```

---

## Důležité technické detaily

- **ČÚZK + tokeny** — nikdy na klientovi (podmínky ČÚZK bod 10), vždy server-side
- **Sreality** — přímé volání `https://www.sreality.cz/api/cs/v2/estates?region=...`, filtrování server-side v `lib/apify.ts`
- **Seed skript** — `valueInputOption: "RAW"` (USER_ENTERED způsobuje #ERROR! u telefonů s +420)
- **ČÚZK endpoint** — `/api/v1/Stavby/Vyhledani` (ne `/Budova/Vyhledat` — to je 404)
- **Google Sheets district codes** — Holešovice=490067, Vinohrady=490229, Žižkov=490261, Smíchov=400301, Dejvice=400459, Karlín=400637
- **Dashboard chart** — `buildChartData()` v DashboardView: start vždy = cutoff (ne první neprázdný bucket), jinak se zobrazuje N-1 měsíců
- **Měsíce na ose** — ruční pole zkratek `["led","úno","bře",...]` místo `toLocaleString("cs-CZ", {month:"short"})` — cs-CZ vrací plná slova
- **Model timeouts** — definováno v `lib/constants.ts`: Haiku 45s, Sonnet 90s, Opus 150s
- **QUICK_PROMPTS** — definováno jednou v `lib/constants.ts`, importováno v ChatInput i MessageList
- **SessionStorage persistence** — aktivní stránka, dark mode, chat history (posledních 30 zpráv), vybraný model
- **Cache invalidace** — `isValidDashboardData()` kontroluje přítomnost `clients.dates` + `properties.dates` array (staré cache bez nich se zahodí)

---

## UX detaily

- **Prázdný chat** — welcome screen s 2-sloupcovým gridem 7 karet (poslední při lichém počtu centrována přes `col-span-2 max-w-[50%] mx-auto`)
- **Po první zprávě** — horizontální chips bar nad inputem
- **Model picker** — inline v ChatInput, výběr persistuje přes reload
- **Dark mode** — výchozí tmavý, toggle v headeru, `dark` prop se předává dolů; light mode má silnější gradient (`rgba(255,160,0,0.22)`)
- **Monitoring panel** — inline editing polí (lokalita, typ, cena, hodina) přes `InlineTextInput` s `size` attr (ne minWidth) aby se layout nerozskakoval
- **Timeout error** — uživateli se zobrazí zpráva s doporučením přepnout na Haiku

---

## Co agent umí nad rámec 6 use cases

- Libovolné kombinace filtrů nad Sheets daty
- Vícekrokové konverzace (ukáž klienty → napiš email prvnímu)
- Výpočty a srovnání z dat (průměrné ceny, makléři s nejvíc leady...)
- Sreality research pro libovolnou lokalitu v ČR
- Přidání událostí do Google Kalendáře přes chat

---

## Aktuální limitace

- Sheets: jen čtení (bez zápisu)
- Sreality: ~20 náhodných výsledků, filtr server-side — ne cílené vyhledávání
- Tabulky: jen search + formátování, bez row click / detail modalu, bez exportu CSV
- Cache: sessionStorage — session-scoped, nesdílí se mezi taby, invaliduje se ručně
- Bez autentizace — kdokoliv s URL má přístup (záměrné rozhodnutí pro demo)
- Cron lokalita hardcoded na "Praha Holešovice" v `/api/cron/route.ts`
