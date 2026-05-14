import { NextRequest, NextResponse } from "next/server";
import {
  getUpcomingEvents,
  findFreeSlots,
  createCalendarEvent,
  getFreeSlotsForNextDays,
} from "@/lib/calendar";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "upcoming";

  try {
    if (action === "upcoming") {
      const days = parseInt(searchParams.get("days") || "7", 10);
      const events = await getUpcomingEvents(days);
      return NextResponse.json({ success: true, events });
    }

    if (action === "free_slots") {
      const date = searchParams.get("date");
      if (!date) {
        return NextResponse.json({ success: false, error: "Missing date parameter" }, { status: 400 });
      }
      const slots = await findFreeSlots(date);
      return NextResponse.json({ success: true, date, slots });
    }

    if (action === "free_slots_week") {
      const days = parseInt(searchParams.get("days") || "5", 10);
      const result = await getFreeSlotsForNextDays(days);
      return NextResponse.json({ success: true, available: result });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, date, start, end, description } = body as {
      title: string;
      date: string;
      start: string;
      end: string;
      description?: string;
    };

    if (!title || !date || !start || !end) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, date, start, end" },
        { status: 400 }
      );
    }

    const result = await createCalendarEvent(title, date, start, end, description);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
