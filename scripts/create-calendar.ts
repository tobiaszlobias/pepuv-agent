/**
 * create-calendar.ts
 * Vytvoří Google Kalendář "Pepa - Pracovní kalendář" a vypíše jeho ID.
 *
 * Spuštění:
 *   npx ts-node scripts/create-calendar.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { google } from "googleapis";

async function main() {
  const svcJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!svcJson) throw new Error("GOOGLE_SERVICE_ACCOUNT not set");

  const credentials = JSON.parse(Buffer.from(svcJson, "base64").toString("utf-8"));
  const serviceEmail = credentials.client_email as string;

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const calendar = google.calendar({ version: "v3", auth });

  console.log(`\nService account: ${serviceEmail}\n`);

  // Create calendar
  const res = await calendar.calendars.insert({
    requestBody: {
      summary: "Pepa - Pracovní kalendář",
      description: "Kalendář Back Office managera Pepy — prohlídky, schůzky, administrativní úkoly.",
      timeZone: "Europe/Prague",
    },
  });

  const calId = res.data.id!;
  console.log(`✅ Kalendář vytvořen!`);
  console.log(`   ID: ${calId}`);
  console.log(`\nPřidej toto do .env.local a Vercel:`);
  console.log(`GOOGLE_CALENDAR_ID=${calId}\n`);

  console.log(`Poznámka: Kalendář je vlastněn service účtem ${serviceEmail}.`);
  console.log(`Aby byl viditelný v Google Calendar UI, sdílej ho s tvým emailem:`);
  console.log(`  npx ts-node scripts/share-calendar.ts ${calId} tvuj@email.com\n`);
}

main().catch(console.error);
