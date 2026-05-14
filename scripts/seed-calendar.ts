/**
 * seed-calendar.ts
 * Naplní Google Kalendář realistickými schůzkami pro realitního makléře.
 * Generuje události na základě dat z Google Sheets (klienti, nemovitosti).
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

// --- helpers ---

function dateStr(offsetDays: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  // skip to Monday if Sunday (0) or Saturday (6)
  const dow = d.getDay();
  if (dow === 0) d.setDate(d.getDate() + 1);
  if (dow === 6) d.setDate(d.getDate() + 2);
  return d.toISOString();
}

// --- event templates ---

interface EventInput {
  summary: string;
  start: string;
  end: string;
  description?: string;
  colorId?: string;
}

// colorId mapping: 1=lavender 2=sage 3=grape 4=flamingo 5=banana 6=tangerine 7=peacock 8=graphite 9=blueberry 10=basil 11=tomato
const EVENTS: EventInput[] = [
  // === TENTO TÝDEN ===

  // Pondělí
  {
    summary: "Interní porada — týdenní plán",
    start: dateStr(0, 9, 0),
    end: dateStr(0, 9, 45),
    description: "Týdenní kick-off, rozdělení zakázek, kontrola pipeline",
    colorId: "8",
  },
  {
    summary: "Prohlídka Holešovice — Novák",
    start: dateStr(0, 10, 30),
    end: dateStr(0, 11, 30),
    description: "Klient: Martin Novák | Nemovitost: Komunardů 28, Praha 7 — 3+kk, 78m²\nTelefon: +420 602 111 222\nZájem o koupi, budget 9–11M",
    colorId: "7",
  },
  {
    summary: "Administrativa — smlouvy Vinohrady",
    start: dateStr(0, 14, 0),
    end: dateStr(0, 15, 0),
    description: "Příprava rezervační smlouvy pro Horáčkovi — Mánesova 45",
    colorId: "8",
  },

  // Úterý
  {
    summary: "Fotografie Smíchov — Plzeňská 101",
    start: dateStr(1, 9, 0),
    end: dateStr(1, 10, 30),
    description: "Focení nového bytu 2+kk, 55m² — přijde fotograf Jan Pospíšil\nNemovitost bude v nabídce příští týden",
    colorId: "5",
  },
  {
    summary: "Prohlídka Žižkov — Kovářová",
    start: dateStr(1, 14, 0),
    end: dateStr(1, 15, 0),
    description: "Klientka: Eva Kovářová | Nemovitost: Seifertova 18, Praha 3 — 2+kk, 62m²\nDruhá prohlídka, velmi zainteresovaná",
    colorId: "7",
  },
  {
    summary: "Prohlídka Vinohrady — Procházka",
    start: dateStr(1, 16, 0),
    end: dateStr(1, 17, 0),
    description: "Klient: Tomáš Procházka | Nemovitost: Blanická 7, Praha 2 — 4+1, 105m²\nFirst viewing",
    colorId: "7",
  },

  // Středa
  {
    summary: "Call s developerem — Karlín projekt",
    start: dateStr(2, 9, 0),
    end: dateStr(2, 9, 30),
    description: "Finální podmínky exkluzivní spolupráce na projektu Karlín Yard — 12 jednotek",
    colorId: "9",
  },
  {
    summary: "Prohlídka Dejvice — Malý",
    start: dateStr(2, 11, 0),
    end: dateStr(2, 12, 0),
    description: "Klient: Ondřej Malý | Nemovitost: Dejvická 33, Praha 6 — 3+kk, 82m²\nZprostředkování, klient hledá 3 měsíce",
    colorId: "7",
  },
  {
    summary: "Oběd — Dvořák (potenciální investor)",
    start: dateStr(2, 12, 30),
    end: dateStr(2, 13, 30),
    description: "Restaurant Café Savoy, Vítězná 5\nŘeditel Dvořák z KB, zájem o investiční nemovitosti",
    colorId: "6",
  },
  {
    summary: "Prohlídka Holešovice — Blahová",
    start: dateStr(2, 15, 0),
    end: dateStr(2, 16, 0),
    description: "Klientka: Petra Blahová | Nemovitost: Ortenovo nám. 14, Praha 7 — 2+kk, 58m²\nReferral od Nováka",
    colorId: "7",
  },

  // Čtvrtek
  {
    summary: "Podpis rezervační smlouvy — Horáček",
    start: dateStr(3, 10, 0),
    end: dateStr(3, 11, 0),
    description: "Klient: Jiří Horáček | Nemovitost: Mánesova 45, Praha 2\nPodpis + výběr zálohy 100 000 Kč\nNotář: JUDr. Kratochvíl",
    colorId: "10",
  },
  {
    summary: "Online call — leadgen reportování",
    start: dateStr(3, 14, 0),
    end: dateStr(3, 14, 30),
    description: "Zoom s Marketingem — výsledky kampaně Google Ads za duben",
    colorId: "8",
  },
  {
    summary: "Prohlídka Žižkov — Šimková",
    start: dateStr(3, 16, 0),
    end: dateStr(3, 17, 0),
    description: "Klientka: Lucie Šimková | Nemovitost: Chelčického 9, Praha 3 — 1+kk, 38m²\nInvestiční záměr — pronájem",
    colorId: "7",
  },

  // Pátek
  {
    summary: "Prohlídka Smíchov — Král",
    start: dateStr(4, 10, 0),
    end: dateStr(4, 11, 0),
    description: "Klient: Pavel Král | Nemovitost: Nádražní 45, Praha 5 — 3+kk, 75m²\nVelmi motivovaný kupec, přijde s partnerkou",
    colorId: "7",
  },
  {
    summary: "Týdenní report — příprava slidů",
    start: dateStr(4, 13, 0),
    end: dateStr(4, 14, 0),
    description: "Příprava týdenního reportu pro vedení — výsledky, statistiky, pipeline",
    colorId: "5",
  },
  {
    summary: "Prohlídka Karlín — Červenka",
    start: dateStr(4, 15, 0),
    end: dateStr(4, 16, 0),
    description: "Klient: Robert Červenka | Nemovitost: Křižíkova 14, Praha 8 — 2+kk, 65m²\nNový lead z Sreality",
    colorId: "7",
  },

  // === PŘÍŠTÍ TÝDEN ===

  {
    summary: "Interní porada — týdenní plán",
    start: dateStr(7, 9, 0),
    end: dateStr(7, 9, 45),
    description: "Týdenní kick-off",
    colorId: "8",
  },
  {
    summary: "Prohlídka Holešovice — Zemanová",
    start: dateStr(7, 10, 0),
    end: dateStr(7, 11, 0),
    description: "Klientka: Jana Zemanová | Nemovitost: Osadní 22, Praha 7 — 3+kk, 80m²",
    colorId: "7",
  },
  {
    summary: "Katastr — ověření vlastnické listiny",
    start: dateStr(7, 14, 0),
    end: dateStr(7, 15, 0),
    description: "Ověření LV pro nemovitost Blanická 7 — příprava podkladů pro notáře",
    colorId: "4",
  },
  {
    summary: "Prohlídka Vinohrady — Janoušek",
    start: dateStr(8, 9, 0),
    end: dateStr(8, 10, 0),
    description: "Klient: Milan Janoušek | Nemovitost: Korunní 32, Praha 2 — 4+kk, 112m²\nVIP klient, přijede s architektem",
    colorId: "7",
  },
  {
    summary: "Online demo — nový CRM systém",
    start: dateStr(8, 11, 0),
    end: dateStr(8, 12, 0),
    description: "Demo Raynet CRM — uvažujeme o přechodu z Google Sheets",
    colorId: "5",
  },
  {
    summary: "Prohlídka Dejvice — Trávníček",
    start: dateStr(8, 14, 0),
    end: dateStr(8, 15, 0),
    description: "Klient: Zdeněk Trávníček | Nemovitost: Thákurova 7, Praha 6 — 3+1, 90m²",
    colorId: "7",
  },
  {
    summary: "Signing — Král (Smíchov)",
    start: dateStr(9, 10, 0),
    end: dateStr(9, 11, 30),
    description: "Podpis kupní smlouvy — Pavel Král, Nádražní 45\nCena: 7,8M Kč. Přijede právník kupujícího.",
    colorId: "10",
  },
  {
    summary: "Prohlídka Karlín — Havlíček",
    start: dateStr(9, 14, 0),
    end: dateStr(9, 15, 0),
    description: "Klient: Petr Havlíček | Nemovitost: Sokolovská 28, Praha 8 — 2+kk, 70m²",
    colorId: "7",
  },
  {
    summary: "Prohlídka Žižkov — Hovorková",
    start: dateStr(10, 9, 30),
    end: dateStr(10, 10, 30),
    description: "Klientka: Dana Hovorková | Nemovitost: Husinecká 4, Praha 3 — 1+kk, 42m²",
    colorId: "7",
  },
  {
    summary: "Sreality — aktualizace inzerátů",
    start: dateStr(10, 13, 0),
    end: dateStr(10, 14, 0),
    description: "Aktualizace fotek + popisů u 5 nemovitostí, cenové korekce",
    colorId: "5",
  },
  {
    summary: "Prohlídka Smíchov — Šourek",
    start: dateStr(10, 15, 0),
    end: dateStr(10, 16, 0),
    description: "Klient: Marek Šourek | Nemovitost: Radlická 55, Praha 5 — 3+kk, 78m²",
    colorId: "7",
  },
  {
    summary: "Konzultace — developer Barrandov",
    start: dateStr(11, 10, 0),
    end: dateStr(11, 11, 0),
    description: "Prezentace nového projektu Barrandov Hills, uvažujeme o partnerství",
    colorId: "9",
  },
  {
    summary: "Prohlídka Holešovice — Čermák",
    start: dateStr(11, 14, 0),
    end: dateStr(11, 15, 0),
    description: "Klient: Lukáš Čermák | Nemovitost: Tusarova 36, Praha 7 — 2+kk, 55m²",
    colorId: "7",
  },
];

async function main() {
  if (!CALENDAR_ID) {
    console.error("❌ GOOGLE_CALENDAR_ID not set in .env.local");
    process.exit(1);
  }

  const calendar = getCalendar();
  console.log(`\n📅 Seeduji Google Kalendář: ${CALENDAR_ID}\n`);

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
      const d = new Date(ev.start);
      console.log(`  ✓ ${ev.summary} (${d.toLocaleDateString("cs-CZ")} ${d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })})`);
      created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${ev.summary} — ${msg}`);
      failed++;
    }
  }

  console.log(`\n✅ Hotovo: ${created} událostí vytvořeno, ${failed} selhalo.\n`);
}

main().catch(console.error);
