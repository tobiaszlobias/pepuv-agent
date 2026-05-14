/**
 * share-calendar.ts
 * Sdílí kalendář s daným emailem (pro zobrazení v Google Calendar UI).
 *
 * Spuštění:
 *   npx ts-node scripts/share-calendar.ts <calendarId> <email>
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { google } from "googleapis";

async function main() {
  const [calendarId, email] = process.argv.slice(2);
  if (!calendarId || !email) {
    console.error("Usage: npx ts-node scripts/share-calendar.ts <calendarId> <email>");
    process.exit(1);
  }

  const svcJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!svcJson) throw new Error("GOOGLE_SERVICE_ACCOUNT not set");

  const credentials = JSON.parse(Buffer.from(svcJson, "base64").toString("utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const calendar = google.calendar({ version: "v3", auth });

  await calendar.acl.insert({
    calendarId,
    requestBody: {
      role: "owner",
      scope: { type: "user", value: email },
    },
  });

  console.log(`✅ Kalendář ${calendarId} sdílen s ${email} (role: owner)`);
}

main().catch(console.error);
