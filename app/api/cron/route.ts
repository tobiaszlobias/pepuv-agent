import { NextRequest, NextResponse } from "next/server";
import { scrapeSreality } from "@/lib/apify";

// Vercel Cron: každý den v 7:00 UTC
// Nastavení v vercel.json

export async function GET(req: NextRequest) {
  // Ověř Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const listings = await scrapeSreality({
      locality: "Praha Holešovice",
      transaction_type: "prodej",
    });

    // TODO: Uložit výsledky do databáze nebo poslat notifikaci
    // V produkci: uložit do Sheets nebo poslat email Pepovi

    console.log(
      `[Cron] Sreality monitoring: nalezeno ${listings.length} nabídek v Praha Holešovice`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      listings_found: listings.length,
      locality: "Praha Holešovice",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Cron] Sreality monitoring error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
