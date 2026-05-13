import { NextRequest, NextResponse } from "next/server";
import { scrapeSreality } from "@/lib/apify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locality = searchParams.get("locality") || "Praha Holešovice";
  const propertyType = searchParams.get("type") || undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;

  const listings = await scrapeSreality({ locality, property_type: propertyType, max_price: maxPrice });
  return NextResponse.json({ listings, scanned_at: new Date().toISOString() });
}
