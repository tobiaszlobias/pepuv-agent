/**
 * seed-calendar.ts
 * Naplní Google Kalendář realistickými schůzkami pro realitního makléře.
 *
 * Spuštění:
 *   npx ts-node scripts/seed-calendar.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { google } from "googleapis";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!;

function getCalendar() {
  const svcJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!svcJson) throw new Error("GOOGLE_SERVICE_ACCOUNT not set");
  const credentials = JSON.parse(Buffer.from(svcJson, "base64").toString("utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

// Vrátí ISO string pro dnešek + offsetDays, nastaví hodinu/minutu.
// Pokud vyjde sobota → +2, neděle → +1 (přeskočí víkend).
function d(offsetDays: number, hour: number, min = 0): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(hour, min, 0, 0);
  const dow = dt.getDay();
  if (dow === 6) dt.setDate(dt.getDate() + 2);
  if (dow === 0) dt.setDate(dt.getDate() + 1);
  return dt.toISOString();
}

interface Ev {
  summary: string;
  start: string;
  end: string;
  description?: string;
  colorId?: string;
}

// colorId: 1=levandule 2=šalvěj 3=hrozen 5=banán 6=mandarinka 7=páv 8=grafit 9=borůvka 10=bazalka 11=rajče
const EVENTS: Ev[] = [

  // ═══════════════════════════════════════════════
  // PONDĚLÍ (offset 0)
  // ═══════════════════════════════════════════════
  {
    summary: "Ranní e-maily + příprava dne",
    start: d(0, 8, 0), end: d(0, 8, 45),
    description: "Inbox zero, prioritizace, odpovědi na dotazy ze Sreality",
    colorId: "8",
  },
  {
    summary: "Interní porada — týdenní plán",
    start: d(0, 9, 0), end: d(0, 9, 45),
    description: "Kick-off s týmem, rozdělení zakázek, pipeline review, kontrola KPI",
    colorId: "8",
  },
  {
    summary: "Prohlídka Holešovice — Novák",
    start: d(0, 10, 30), end: d(0, 11, 30),
    description: "Klient: Martin Novák | Komunardů 28, Praha 7 — 3+kk 78m²\nBudget 9–11M, velmi motivovaný, přijede s manželkou\nTel: +420 602 111 222",
    colorId: "7",
  },
  {
    summary: "Telefonát — Banka (hypotéka Horáček)",
    start: d(0, 12, 0), end: d(0, 12, 30),
    description: "KB poradce Ing. Šimánek — potvrzení hypotéky 6,5M pro Jiřího Horáčka\nNemovitost: Mánesova 45, Praha 2",
    colorId: "9",
  },
  {
    summary: "Administrativa — smlouvy Vinohrady",
    start: d(0, 14, 0), end: d(0, 15, 0),
    description: "Příprava rezervační smlouvy + kupní smlouvy pro Horáčkovi\nKontrola právníkem JUDr. Kratochvíl",
    colorId: "8",
  },
  {
    summary: "Prohlídka Karlín — Červenka",
    start: d(0, 15, 30), end: d(0, 16, 30),
    description: "Klient: Robert Červenka | Křižíkova 14, Praha 8 — 2+kk 65m²\nNový lead ze Sreality, první kontakt\nTel: +420 775 333 444",
    colorId: "7",
  },
  {
    summary: "Follow-up volání — 4 klienti ve fázi nabídky",
    start: d(0, 17, 0), end: d(0, 17, 45),
    description: "Blok na follow-up: Procházka (Vinohrady), Šimková (Žižkov), Dvořáková (Dejvice), Marek (Smíchov)",
    colorId: "6",
  },

  // ═══════════════════════════════════════════════
  // ÚTERÝ (offset 1)
  // ═══════════════════════════════════════════════
  {
    summary: "Ranní e-maily + Sreality monitoring",
    start: d(1, 8, 0), end: d(1, 8, 30),
    description: "Kontrola nových nabídek Praha 7, Praha 2, Praha 8 — ranní monitoring",
    colorId: "8",
  },
  {
    summary: "Fotografie Smíchov — Plzeňská 101",
    start: d(1, 9, 0), end: d(1, 10, 30),
    description: "Focení 2+kk 55m² — fotograf Jan Pospíšil\nPříprava na inzerci příští týden, cílová cena 7,2M",
    colorId: "5",
  },
  {
    summary: "Call — developer Karlín Yard",
    start: d(1, 11, 0), end: d(1, 11, 45),
    description: "Finální podmínky exkluzivní spolupráce na projektu Karlín Yard — 12 jednotek, provize 2,5%",
    colorId: "9",
  },
  {
    summary: "Prohlídka Žižkov — Kovářová (2. prohlídka)",
    start: d(1, 13, 0), end: d(1, 14, 0),
    description: "Klientka: Eva Kovářová | Seifertova 18, Praha 3 — 2+kk 62m²\nDruhá prohlídka, přijde s rodiči jako poradci\nOčekává se nabídka 8,4M",
    colorId: "7",
  },
  {
    summary: "Schůzka — JUDr. Kratochvíl (notář)",
    start: d(1, 14, 30), end: d(1, 15, 15),
    description: "Kontrola kupní smlouvy Horáček — Mánesova 45\nRozpor v článku 4.2 o vyklizení — nutno opravit",
    colorId: "3",
  },
  {
    summary: "Prohlídka Vinohrady — Procházka",
    start: d(1, 16, 0), end: d(1, 17, 0),
    description: "Klient: Tomáš Procházka | Blanická 7, Praha 2 — 4+1 105m²\nFirst viewing, přichází s architektkou\nBudget 14M",
    colorId: "7",
  },
  {
    summary: "Aktualizace CRM + pipeline",
    start: d(1, 17, 15), end: d(1, 17, 45),
    description: "Zápis z dnešních schůzek do Sheets, update statusů leadů",
    colorId: "8",
  },

  // ═══════════════════════════════════════════════
  // STŘEDA (offset 2)
  // ═══════════════════════════════════════════════
  {
    summary: "Ranní e-maily + příprava prezentací",
    start: d(2, 8, 0), end: d(2, 8, 45),
    description: "Příprava materiálů pro dnešní prohlídky, update inzerátů",
    colorId: "8",
  },
  {
    summary: "Prohlídka Dejvice — Malý",
    start: d(2, 9, 30), end: d(2, 10, 30),
    description: "Klient: Ondřej Malý | Dejvická 33, Praha 6 — 3+kk 82m²\nHledá 3 měsíce, velmi selektivní\nTel: +420 603 222 111",
    colorId: "7",
  },
  {
    summary: "Telefonát — pojišťovna (nemovitostní pojištění)",
    start: d(2, 11, 0), end: d(2, 11, 30),
    description: "Kooperativa — sjednání pojištění pro nového klienta před podpisem\nNemovitost Nádražní 45, Praha 5",
    colorId: "9",
  },
  {
    summary: "Oběd — Dvořák (investor, KB)",
    start: d(2, 12, 30), end: d(2, 13, 30),
    description: "Restaurant Café Savoy, Vítězná 5\nŘeditel Dvořák — zájem o 3 investiční byty Praha 7\nPotenciál 25–30M v jedné transakci",
    colorId: "6",
  },
  {
    summary: "Prohlídka Holešovice — Blahová",
    start: d(2, 14, 0), end: d(2, 15, 0),
    description: "Klientka: Petra Blahová | Ortenovo nám. 14, Praha 7 — 2+kk 58m²\nReferral od Nováka, hledá investiční byt na pronájem",
    colorId: "7",
  },
  {
    summary: "Prohlídka Holešovice — Blahová (2. byt)",
    start: d(2, 15, 15), end: d(2, 16, 15),
    description: "Klientka: Petra Blahová | Tusarova 36, Praha 7 — 2+kk 55m²\nSrovnání dvou bytů ve stejné lokalitě",
    colorId: "7",
  },
  {
    summary: "Videohovor — Sreality account manager",
    start: d(2, 16, 30), end: d(2, 17, 0),
    description: "Vyjednávání ceny prémiového výpisu TOP nabídka\nAktuálně 3 nemovitosti v Top pozici",
    colorId: "9",
  },
  {
    summary: "Admin — fakturace + provize",
    start: d(2, 17, 0), end: d(2, 17, 45),
    description: "Příprava faktury za uzavřenou zakázku Smíchov, přehled splatných provizí",
    colorId: "8",
  },

  // ═══════════════════════════════════════════════
  // ČTVRTEK (offset 3)
  // ═══════════════════════════════════════════════
  {
    summary: "Ranní e-maily + odpovědi na nové leady",
    start: d(3, 8, 0), end: d(3, 8, 30),
    description: "Odpovědi na 6 nových poptávek ze Sreality a webu",
    colorId: "8",
  },
  {
    summary: "Schůzka na ČÚZK — ověření LV Blanická",
    start: d(3, 9, 0), end: d(3, 9, 45),
    description: "Ověření vlastnické listiny Blanická 7 — příprava podkladů pro notáře\nVěcné břemeno — nutno prověřit",
    colorId: "4",
  },
  {
    summary: "Podpis rezervační smlouvy — Horáček",
    start: d(3, 10, 0), end: d(3, 11, 0),
    description: "Klient: Jiří Horáček | Mánesova 45, Praha 2\nRezerváční záloha 100 000 Kč\nPřijde s manželkou a advokátem",
    colorId: "10",
  },
  {
    summary: "Prohlídka Žižkov — Šimková",
    start: d(3, 11, 30), end: d(3, 12, 30),
    description: "Klientka: Lucie Šimková | Chelčického 9, Praha 3 — 1+kk 38m²\nInvestiční záměr, chce byt na pronájem\nBudget 4,5M",
    colorId: "7",
  },
  {
    summary: "Telefonát — Novák (zpětná vazba z pondělní prohlídky)",
    start: d(3, 13, 0), end: d(3, 13, 30),
    description: "Follow-up po prohlídce Komunardů 28\nOčekáváme nabídku nebo odmítnutí",
    colorId: "6",
  },
  {
    summary: "Online call — leadgen reportování (Google Ads)",
    start: d(3, 14, 0), end: d(3, 14, 30),
    description: "Zoom s marketingem — výsledky kampaně duben\nCPL 850 Kč, 23 nových leadů\nNávrh navýšení rozpočtu na Praha 7",
    colorId: "8",
  },
  {
    summary: "Prohlídka Smíchov — Král",
    start: d(3, 15, 0), end: d(3, 16, 0),
    description: "Klient: Pavel Král | Nádražní 45, Praha 5 — 3+kk 75m²\nVelmi motivovaný, přijede s partnerkou\nExpektujeme nabídku do 48h",
    colorId: "7",
  },
  {
    summary: "Prohlídka Smíchov — Navrátil",
    start: d(3, 16, 15), end: d(3, 17, 15),
    description: "Klient: Radek Navrátil | Radlická 22, Praha 5 — 2+kk 60m²\nNový zájemce z inzerce, první kontakt",
    colorId: "7",
  },
  {
    summary: "Zápis z dne + příprava na pátek",
    start: d(3, 17, 15), end: d(3, 17, 45),
    description: "Update pipeline, příprava materiálů na pátečního klienta VIP",
    colorId: "8",
  },

  // ═══════════════════════════════════════════════
  // PÁTEK (offset 4)
  // ═══════════════════════════════════════════════
  {
    summary: "Ranní e-maily + týdenní přehled",
    start: d(4, 8, 0), end: d(4, 8, 30),
    description: "Kontrola týdenních výsledků, přehled uzavřených obchodů",
    colorId: "8",
  },
  {
    summary: "Prohlídka Vinohrady — Janoušek (VIP)",
    start: d(4, 9, 0), end: d(4, 10, 30),
    description: "Klient: Milan Janoušek | Korunní 32, Praha 2 — 4+kk 112m²\nVIP klient, přijede s architektkou Ing. Horáková\nBudget 18M, rozhoduje mezi 3 nemovitostmi",
    colorId: "11",
  },
  {
    summary: "Telefonát — Kovářová (nabídka Žižkov)",
    start: d(4, 11, 0), end: d(4, 11, 30),
    description: "Očekáváme nabídku 8,3M po druhé prohlídce\nV případě odmítnutí — alternativa Vinohrady",
    colorId: "6",
  },
  {
    summary: "Prohlídka Dejvice — Hovorka",
    start: d(4, 12, 0), end: d(4, 13, 0),
    description: "Klient: Vladimír Hovorka | Thákurova 7, Praha 6 — 3+1 90m²\nReferral od dlouhodobého klienta",
    colorId: "7",
  },
  {
    summary: "Oběd (pracovní) — nový spolupracující makléř",
    start: d(4, 13, 0), end: d(4, 14, 0),
    description: "Setkání s Ondřejem Blažkem z M&M Reality\nPotenciální spolupráce na sdílení leadů Praha 6/7",
    colorId: "6",
  },
  {
    summary: "Týdenní report — příprava slidů",
    start: d(4, 14, 0), end: d(4, 15, 0),
    description: "Příprava týdenního reportu pro vedení — výsledky, statistiky, pipeline, next steps",
    colorId: "5",
  },
  {
    summary: "Prohlídka Žižkov — Pokorný",
    start: d(4, 15, 30), end: d(4, 16, 30),
    description: "Klient: Miroslav Pokorný | Husinecká 4, Praha 3 — 2+kk 55m²\nCenově citlivý klient, budget max 7M",
    colorId: "7",
  },
  {
    summary: "Konec týdne — uzávěrka + plánování PO",
    start: d(4, 17, 0), end: d(4, 17, 45),
    description: "Zápis výsledků, update Google Sheets, plán na příští pondělí\nKontrola emailů do konce pracovní doby",
    colorId: "8",
  },

  // ═══════════════════════════════════════════════
  // PŘÍŠTÍ TÝDEN — PONDĚLÍ (offset 7)
  // ═══════════════════════════════════════════════
  {
    summary: "Interní porada — týdenní plán",
    start: d(7, 9, 0), end: d(7, 9, 45),
    description: "Kick-off, pipeline review, cíle týdne",
    colorId: "8",
  },
  {
    summary: "Prohlídka Holešovice — Zemanová",
    start: d(7, 10, 30), end: d(7, 11, 30),
    description: "Klientka: Jana Zemanová | Osadní 22, Praha 7 — 3+kk 80m²\nFirst viewing, přichází sama",
    colorId: "7",
  },
  {
    summary: "Schůzka — ČÚZK, ověření LV Mánesova",
    start: d(7, 12, 0), end: d(7, 12, 45),
    description: "Finální kontrola vlastnické listiny před podpisem kupní smlouvy Horáček",
    colorId: "4",
  },
  {
    summary: "Prohlídka Karlín — Havlíček",
    start: d(7, 14, 0), end: d(7, 15, 0),
    description: "Klient: Petr Havlíček | Sokolovská 28, Praha 8 — 2+kk 70m²\nInvestiční záměr, třetí prohlídka",
    colorId: "7",
  },
  {
    summary: "Call — developer Barrandov Hills",
    start: d(7, 15, 30), end: d(7, 16, 15),
    description: "Prezentace nového projektu Barrandov Hills\nUvažujeme o exkluzivní spolupráci na 8 jednotkách",
    colorId: "9",
  },
  {
    summary: "Follow-up volání — leady z minulého týdne",
    start: d(7, 16, 30), end: d(7, 17, 15),
    description: "Blok: Navrátil (Smíchov), Pokorný (Žižkov), Hovorka (Dejvice)",
    colorId: "6",
  },

  // ÚTERÝ (offset 8)
  {
    summary: "Prohlídka Vinohrady — Janoušek (2. prohlídka)",
    start: d(8, 9, 0), end: d(8, 10, 30),
    description: "Klient: Milan Janoušek | Korunní 32 — podruhé, tentokrát s manželem architektem\nRozhodovací prohlídka",
    colorId: "11",
  },
  {
    summary: "Online demo — nový CRM systém (Raynet)",
    start: d(8, 11, 0), end: d(8, 12, 0),
    description: "Uvažujeme o přechodu z Google Sheets na Raynet CRM\nDemo pro Pepu + ředitelku",
    colorId: "5",
  },
  {
    summary: "Prohlídka Dejvice — Trávníček",
    start: d(8, 13, 0), end: d(8, 14, 0),
    description: "Klient: Zdeněk Trávníček | Thákurova 7, Praha 6 — 3+1 90m²\nPřijede s hypotečním poradcem",
    colorId: "7",
  },
  {
    summary: "Prohlídka Karlín — Švestka",
    start: d(8, 14, 30), end: d(8, 15, 30),
    description: "Klient: Tomáš Švestka | Křižíkova 38, Praha 8 — 3+kk 85m²\nNový inzertní lead, young professional",
    colorId: "7",
  },
  {
    summary: "Telefonát — Banka (hypotéka Trávníček)",
    start: d(8, 16, 0), end: d(8, 16, 30),
    description: "Česká spořitelna, poradce Mgr. Veselá — prověření bonity klienta",
    colorId: "9",
  },
  {
    summary: "Admin — příprava nové inzerce Smíchov",
    start: d(8, 17, 0), end: d(8, 17, 45),
    description: "Psaní inzerátního textu pro Plzeňská 101, nahrávání fotek na Sreality + bezrealitky",
    colorId: "8",
  },

  // STŘEDA (offset 9)
  {
    summary: "Signing — Král (Smíchov, kupní smlouva)",
    start: d(9, 10, 0), end: d(9, 11, 30),
    description: "Klient: Pavel Král | Nádražní 45, Praha 5 — kupní smlouva\nCena: 7,8M Kč, přijede s advokátem JUDr. Novotný\nNotář: JUDr. Kratochvíl, Mánesova 28",
    colorId: "10",
  },
  {
    summary: "Prohlídka Holešovice — Čermák",
    start: d(9, 12, 0), end: d(9, 13, 0),
    description: "Klient: Lukáš Čermák | Tusarova 36, Praha 7 — 2+kk 55m²\nPřijde s přítelkyní, rozhoduje se mezi Holešovicemi a Žižkovem",
    colorId: "7",
  },
  {
    summary: "Prohlídka Žižkov — Horák",
    start: d(9, 14, 0), end: d(9, 15, 0),
    description: "Klient: Jan Horák | Seifertova 30, Praha 3 — 1+kk 40m²\nInvestor, chce rychlé uzavření",
    colorId: "7",
  },
  {
    summary: "Konzultace — developer Barrandov (pokračování)",
    start: d(9, 15, 30), end: d(9, 16, 30),
    description: "Detaily spolupráce, pricelisty, podmínky exkluzivity\nPrávní review smlouvy",
    colorId: "9",
  },

  // ČTVRTEK (offset 10)
  {
    summary: "Prohlídka Žižkov — Hovorková",
    start: d(10, 9, 0), end: d(10, 10, 0),
    description: "Klientka: Dana Hovorková | Husinecká 4, Praha 3 — 1+kk 42m²\nInvestiční záměr, pronájem studentům",
    colorId: "7",
  },
  {
    summary: "Prohlídka Vinohrady — Klimešová",
    start: d(10, 10, 30), end: d(10, 11, 30),
    description: "Klientka: Hana Klimešová | Mánesova 60, Praha 2 — 3+kk 88m²\nFirst viewing, doporučena od Horáčka",
    colorId: "7",
  },
  {
    summary: "Telefonát — Zemanová (zpětná vazba)",
    start: d(10, 12, 0), end: d(10, 12, 30),
    description: "Follow-up po pondělní prohlídce Osadní 22\nOčekáváme nabídku nebo zájem o druhou prohlídku",
    colorId: "6",
  },
  {
    summary: "Schůzka — účetní (čtvrtletní uzávěrka)",
    start: d(10, 13, 0), end: d(10, 14, 0),
    description: "Ing. Horáková — přehled provizí Q1, daňová optimalizace, odpisy\nPřinést faktury za duben",
    colorId: "3",
  },
  {
    summary: "Sreality — aktualizace inzerátů + cenové korekce",
    start: d(10, 14, 30), end: d(10, 15, 30),
    description: "Update fotek u 4 nemovitostí, snížení ceny Žižkov o 200k po 6 týdnech bez zájmu",
    colorId: "5",
  },
  {
    summary: "Prohlídka Smíchov — Šourek",
    start: d(10, 16, 0), end: d(10, 17, 0),
    description: "Klient: Marek Šourek | Radlická 55, Praha 5 — 3+kk 78m²\nDruhá prohlídka, přijede s rodiči",
    colorId: "7",
  },

  // PÁTEK (offset 11)
  {
    summary: "Prohlídka Karlín — nová nabídka (open house)",
    start: d(11, 9, 0), end: d(11, 11, 0),
    description: "Open house — Sokolovská 52, Praha 8, 4+kk 95m²\nPozváno 6 zájemců v 30min intervalech\nNová nemovitost v portfoliu",
    colorId: "7",
  },
  {
    summary: "Schůzka — hypoteční poradce (3 klienti)",
    start: d(11, 11, 30), end: d(11, 12, 30),
    description: "Pravidelná schůzka s Mgr. Veselou (ČS)\nAktualizace statusů hypoték: Trávníček, Švestka, Hovorková",
    colorId: "9",
  },
  {
    summary: "Prohlídka Holešovice — Čermák (2. prohlídka)",
    start: d(11, 13, 30), end: d(11, 14, 30),
    description: "Klient: Lukáš Čermák — rozhodovací prohlídka\nPokud OK, podáváme rezervaci tento týden",
    colorId: "7",
  },
  {
    summary: "Konzultace — developer (Karlín Yard, podpis smlouvy)",
    start: d(11, 15, 0), end: d(11, 16, 0),
    description: "Podpis smlouvy o exkluzivním zastoupení — 12 jednotek\nProvize 2,5%, exkluzivita 18 měsíců",
    colorId: "10",
  },
  {
    summary: "Konec týdne — uzávěrka + retrospektiva",
    start: d(11, 16, 30), end: d(11, 17, 30),
    description: "Zápis výsledků, update databáze, plánování příštího týdne\nKontrola pipeline — 8 aktivních nabídek",
    colorId: "8",
  },
];

async function main() {
  if (!CALENDAR_ID) {
    console.error("❌ GOOGLE_CALENDAR_ID not set in .env.local");
    process.exit(1);
  }

  const calendar = getCalendar();
  console.log(`\n📅 Seeduji Google Kalendář (${EVENTS.length} událostí)...\n`);

  let created = 0;
  let failed = 0;

  for (const ev of EVENTS) {
    try {
      await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: {
          summary: ev.summary,
          description: ev.description,
          colorId: ev.colorId,
          start: { dateTime: ev.start, timeZone: "Europe/Prague" },
          end: { dateTime: ev.end, timeZone: "Europe/Prague" },
        },
      });
      const dt = new Date(ev.start);
      const day = dt.toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" });
      const time = dt.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
      console.log(`  ✓ ${day} ${time}  ${ev.summary}`);
      created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${ev.summary} — ${msg}`);
      failed++;
    }
  }

  console.log(`\n✅ Hotovo: ${created} vytvořeno, ${failed} selhalo.\n`);
}

main().catch(console.error);
