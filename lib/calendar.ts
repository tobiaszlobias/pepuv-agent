import { google } from "googleapis";

function getAuth() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT not set");

  const credentials = JSON.parse(
    Buffer.from(serviceAccountJson, "base64").toString("utf-8")
  );

  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
}

function getCalendarId(): string {
  const id = process.env.GOOGLE_CALENDAR_ID;
  if (!id) throw new Error("GOOGLE_CALENDAR_ID not set");
  return id;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  description?: string;
}

export interface FreeSlot {
  date: string;
  start: string;
  end: string;
  label: string;
}

export async function getUpcomingEvents(days = 7): Promise<CalendarEvent[]> {
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = getCalendarId();

  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const items = res.data.items || [];
  return items
    .filter((e) => e.start?.dateTime || e.start?.date)
    .map((e) => {
      const startDt = e.start?.dateTime || e.start?.date || "";
      const endDt = e.end?.dateTime || e.end?.date || startDt;
      const d = new Date(startDt);
      return {
        id: e.id || "",
        title: e.summary || "(bez názvu)",
        date: d.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" }),
        start: e.start?.dateTime
          ? d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })
          : "celý den",
        end: e.end?.dateTime
          ? new Date(endDt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })
          : "",
        description: e.description || undefined,
      };
    });
}

export async function findFreeSlots(date: string): Promise<FreeSlot[]> {
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = getCalendarId();

  const dayStart = new Date(`${date}T08:00:00`);
  const dayEnd = new Date(`${date}T18:00:00`);

  const res = await calendar.events.list({
    calendarId,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const busy: { start: Date; end: Date }[] = (res.data.items || [])
    .filter((e) => e.start?.dateTime)
    .map((e) => ({
      start: new Date(e.start!.dateTime!),
      end: new Date(e.end!.dateTime!),
    }));

  // Generate 30-minute slots from 8:00 to 18:00 with 30-min buffer around busy periods
  const slots: FreeSlot[] = [];
  const slotDuration = 60 * 60 * 1000; // 1 hour slots for viewings
  const buffer = 30 * 60 * 1000; // 30-minute buffer

  let cursor = new Date(dayStart);
  while (cursor.getTime() + slotDuration <= dayEnd.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + slotDuration);

    const blocked = busy.some((b) => {
      const bufferedStart = new Date(b.start.getTime() - buffer);
      const bufferedEnd = new Date(b.end.getTime() + buffer);
      return slotStart < bufferedEnd && slotEnd > bufferedStart;
    });

    if (!blocked) {
      const startStr = slotStart.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
      const endStr = slotEnd.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
      const dateStr = slotStart.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" });
      slots.push({
        date,
        start: startStr,
        end: endStr,
        label: `${dateStr} ${startStr}–${endStr}`,
      });
    }

    cursor = new Date(cursor.getTime() + 30 * 60 * 1000); // step by 30 min
  }

  return slots;
}

export async function createCalendarEvent(
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  description?: string
): Promise<{ id: string; link: string }> {
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = getCalendarId();

  const startIso = `${date}T${startTime}:00`;
  const endIso = `${date}T${endTime}:00`;

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: title,
      description,
      start: { dateTime: startIso, timeZone: "Europe/Prague" },
      end: { dateTime: endIso, timeZone: "Europe/Prague" },
    },
  });

  return {
    id: res.data.id || "",
    link: res.data.htmlLink || "",
  };
}

export async function getFreeSlotsForNextDays(
  days = 5
): Promise<{ date: string; slots: FreeSlot[] }[]> {
  const results: { date: string; slots: FreeSlot[] }[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    // skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = d.toISOString().split("T")[0];
    try {
      const slots = await findFreeSlots(dateStr);
      if (slots.length > 0) results.push({ date: dateStr, slots });
    } catch {
      // skip if error for this day
    }
  }

  return results;
}
