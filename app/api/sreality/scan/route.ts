import { NextResponse } from "next/server";
import { scrapeSreality } from "@/lib/apify";

export async function GET() {
  const listings = await scrapeSreality({ locality: "Praha Holešovice" });
  return NextResponse.json({ listings, scanned_at: new Date().toISOString() });
}
