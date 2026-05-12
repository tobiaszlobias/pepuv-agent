import { NextResponse } from "next/server";
import { getProperties } from "@/lib/sheets";

export async function GET() {
  const properties = await getProperties();
  return NextResponse.json(properties);
}
