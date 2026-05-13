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

## Aktuální stav (14. 5. 2026 — noc)

✅ Všech 6 use cases ze zadání funguje na live deploymentu  
✅ Google Sheets data naseedována (50 klientů, 50 nemovitostí, 50 leadů)  
✅ Dark mode + light mode toggle (výchozí: tmavý, perzistuje přes reload)  
✅ react-markdown + remark-gfm (tabulky, bold, headings)  
✅ ErrorBoundary kolem grafů a slidů  
✅ Cycling loading text ("Načítám data...", "Volám nástroje..."...)  
✅ Sreality — přímé volání Sreality public API (nahrazeno Apify)  
✅ Redesign UI — Syne + Inter fonty, žlutá hero barva (#FFD600), CSS custom properties  
✅ Ochrana heslem (LoginScreen + /api/auth, heslo v env PASSWORD)  
✅ Sidebar stránky: Klienti, Nemovitosti, Leady (tabulky z Sheets, search, cache)  
✅ SessionStorage persistence — aktivní stránka, dark mode, chat history, data tabulek  
✅ Dashboard — KPI cards, area chart + timeslot picker (3m/6m/12m/Vše), pie chart, Sreality panel  
✅ Tabulky — formátované ceny (8 M Kč), datum (cs-CZ), status/stav color badges  
✅ AgentChart — bar/line/pie, horizontal layout, color zones (green/yellow/red/gray), reference line, color legend  
✅ SVG nav ikony (bez emoji), tooltip bez dvojtečky, user-select: none na dashboardu  
✅ Mobilní layout — bottom nav, responzivní dashboard grid, h-[100dvh], viewport user-scalable=no  
✅ Chat input přesunut nad bottom nav (nebyl schovaný)  
✅ KPI cards count-up animace (ease-out cubic, 900ms) při prvním loadu  
✅ Area chart animace při změně timeslotu (key={timeSlot}, 500ms ease-out)  
✅ Dashboard chart: adaptive x-axis labels (zkrácené na mobilu), CartesianGrid horizontální čáry  
✅ Dashboard metric/timeslot switcher — stejný pill styl, stacked na mobilu  
✅ Dashboard property dates opraveny (byly hardcoded []), cache invalidace přes isValidDashboardData()  
✅ Dashboard sekce "Leady podle statusu" odstraněna, monitoring rozšířen (2-col grid nabídek)  
✅ Makléři progress bary + podíl %, uzavřeno celkem  
✅ AgentChart line → AreaChart s gradientem (konzistentní s dashboardem)  
✅ ReportSlides redesign — CSS vars, žlutá, bez indigo, bez dark prop  
✅ Systémový prompt s pevnými šablonami pro known query types (report, trend, email, monitoring...)  
✅ Model picker dropdown — Haiku/Sonnet/Opus, sidebar + chat header (mobil i desktop)  
✅ Quick prompts → dropdown s celými texty ze zadání (ne zkrácené)  
✅ DataTable card layout na mobilu — žádný horizontální scroll  
✅ User avatar v chatu — prasepepa.png  
✅ Theme toggle se slunce/měsíc ikonami  
✅ Sidebar/header výška srovnána (65px)  

**Zbývá:** Natočit demo video

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **AI:** Claude API (`claude-sonnet-4-6`) — tool use loop
- **Interní data:** Google Sheets (googleapis) — service account auth
- **Katastr:** ČÚZK REST API (`api-kn.cuzk.gov.cz`) — server-side only
- **Monitoring trhu:** Apify (`shahidirfan/sreality-cz-scraper`) — server-side only
- **Grafy:** Recharts (bar, line, pie) — inline v chatu
- **Markdown:** react-markdown + remark-gfm
- **Nasazení:** Vercel + Vercel Cron (ranní monitoring 7:00 UTC)

---

## Environment Variables

```
ANTHROPIC_API_KEY=        ← Claude API klíč
CUZK_API_KEY=             ← ČÚZK REST API klíč (500 volání/den)
GOOGLE_SHEETS_ID=         ← ID Google Sheetu
GOOGLE_SERVICE_ACCOUNT=   ← Google service account JSON (base64)
APIFY_API_TOKEN=          ← Apify token
PASSWORD=                 ← Heslo pro přihlašovací obrazovku
```

---

## 6 požadavků ze zadání (všechny splněny)

1. **Dotazy nad daty + grafy** — klienti, nemovitosti, leady ze Sheets + Recharts
2. **Trend grafy** — vývoj leadů/prodejů za posledních N měsíců
3. **Email asistent** — draft s mock termíny z kalendáře
4. **Chybějící data** — nemovitosti bez roku rekonstrukce
5. **Týdenní report + slidy** — 3 styled React slide komponenty v chatu
6. **Monitoring trhu** — Sreality přes Apify, Vercel Cron každé ráno

---

## Architektura

```
/app
  /api
    /agent/route.ts            ← hlavní API route, Claude tool use loop
    /auth/route.ts             ← POST ověření hesla (env PASSWORD)
    /cron/route.ts             ← Vercel Cron — ranní monitoring Sreality
    /sheets/
      clients/route.ts         ← GET všichni klienti
      properties/route.ts      ← GET všechny nemovitosti
      leads/route.ts           ← GET všechny leady
  /components
    /chat/
      MessageList.tsx          ← react-markdown, ErrorBoundary kolem grafů/slidů
      ChatInput.tsx            ← textarea, quick prompts
    /charts/
      AgentChart.tsx           ← Recharts wrapper (bar/line/pie)
    /slides/
      ReportSlides.tsx         ← 3 slide komponenty
    /views/
      ClientsView.tsx          ← tabulka klientů, search, cache
      PropertiesView.tsx       ← tabulka nemovitostí, search, cache
      LeadsView.tsx            ← tabulka leadů, search, cache
    DataTable.tsx              ← sdílená tabulka, client-side search filtrování
    ErrorBoundary.tsx          ← React class component, fallback UI
  /lib
    /tools/definitions.ts      ← JSON schema pro 8 nástrojů Claudea
    sheets.ts                  ← Google Sheets helper (getClients/Properties/Leads)
    cache.ts                   ← in-memory + sessionStorage cache (getCached/setCached)
    cuzk.ts                    ← ČÚZK API (searchByAddress, searchByParcel)
    apify.ts                   ← Apify scraper, server-side filtrování locality
  /scripts
    seed-sheets.ts             ← seed skript, valueInputOption: "RAW"
```

### Tool use loop

1. Uživatel napíše dotaz
2. POST /api/agent → Claude dostane dotaz + 8 nástrojů
3. Claude volá nástroje (loop dokud stop_reason !== "tool_use")
4. Výsledky nástrojů zpět Claudovi
5. Finální odpověď → text + charts[] + slides[]
6. Frontend renderuje markdown, grafy, slidy inline

---

## Nástroje agenta

```typescript
get_clients(quarter?, year?, source?)
get_properties(status?, type?, missing_field?)
get_leads(months?, source?)
search_cuzk(address?, parcel_number?, cadastral_area?)
search_sreality(locality, property_type?, max_price?)
draft_email(client_name, property_address, available_slots?)
generate_report(week)
create_chart(type: 'bar'|'line'|'pie', data, title, x_key?, y_key?)
```

---

## Wichtige technické detaily

- **ČÚZK + Apify tokeny** — nikdy na klientovi (podmínky ČÚZK bod 10)
- **Sreality** — přímé volání `https://www.sreality.cz/api/cs/v2/estates?region=...` (Apify nahrazen), `lib/apify.ts` zachováno jako název souboru
- **Seed skript** — `valueInputOption: "RAW"` (USER_ENTERED způsobuje #ERROR! u telefonů s +420)
- **Dark mode** — výchozí tmavý, toggle v headeru, `dark` prop prochází do všech komponent
- **ČÚZK endpoint** — `/api/v1/Stavby/Vyhledani` (ne /Budova/Vyhledat — to je 404)
- **Google Sheets** — Prague district codes: Holešovice=490067, Vinohrady=490229, Žižkov=490261, Smíchov=400301, Dejvice=400459, Karlín=400637

---

## Co agent umí nad rámec 6 use cases

- Libovolné kombinace filtrů nad Sheets daty
- Vícekrokové konverzace (ukáž klienty → napiš email prvnímu)
- Výpočty a srovnání z dat (průměrné ceny, makléři s nejvíc leady...)
- Screality research pro libovolnou lokalitu v ČR (s omezeními free tieru)

## Aktuální limitace

- Sheets: jen čtení (bez zápisu)
- Sreality: ~20 náhodných výsledků, filtr server-side — ne cílené vyhledávání
- Tabulky: jen search + formátování, bez row click / detail modalu, bez exportu CSV
- Cache: sessionStorage — session-scoped, nesdílí se mezi taby
