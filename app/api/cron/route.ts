import { NextRequest, NextResponse } from "next/server";
import { scrapeSreality } from "@/lib/apify";
import { appendMonitoringRow } from "@/lib/sheets";

// Vercel Cron: každý den v 7:00 UTC
// Nastavení v vercel.json

export async function GET(req: NextRequest) {
  // Ověř Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locality = "Praha Holešovice";

  try {
    const listings = await scrapeSreality({ locality, transaction_type: "prodej" });
    const timestamp = new Date().toISOString();

    await appendMonitoringRow({
      timestamp,
      locality,
      count: listings.length,
      listings: listings.map((l) => ({ address: l.address, price: l.price, url: l.url })),
    });

    console.log(`[Cron] Sreality monitoring: nalezeno ${listings.length} nabídek v ${locality}, uloženo do Sheets`);

    return NextResponse.json({
      success: true,
      timestamp,
      listings_found: listings.length,
      locality,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Cron] Sreality monitoring error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
