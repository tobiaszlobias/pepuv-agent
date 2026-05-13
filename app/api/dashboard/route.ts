import { NextResponse } from "next/server";
import { getClients, getProperties, getLeads } from "@/lib/sheets";

export async function GET() {
  const [clients, properties, leads] = await Promise.all([
    getClients(),
    getProperties(),
    getLeads(),
  ]);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Klienti
  const newClientsThisMonth = clients.filter((c) => {
    if (!c.datum_pridani) return false;
    const d = new Date(c.datum_pridani);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const clientsBySource = clients.reduce<Record<string, number>>((acc, c) => {
    const src = c.zdroj || "Neznámý";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  // Nemovitosti
  const forSale = properties.filter((p) =>
    p.stav.toLowerCase().includes("prodej") || p.stav.toLowerCase().includes("nabídka")
  ).length;

  const missingRekonstrukce = properties.filter(
    (p) => !p.rok_rekonstrukce || p.rok_rekonstrukce === ""
  ).length;

  const prices = properties
    .map((p) => parseInt(p.cena.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n) && n > 0);
  const avgPrice = prices.length > 0
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0;

  // Leady — posledních 6 měsíců po měsících
  const leadsByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const count = leads.filter((l) => {
      if (!l.datum) return false;
      const ld = new Date(l.datum);
      return ld.getMonth() === m && ld.getFullYear() === y;
    }).length;
    leadsByMonth.push({
      month: d.toLocaleString("cs-CZ", { month: "short" }),
      count,
    });
  }

  const activeLeads = leads.filter((l) =>
    l.status.toLowerCase().includes("aktivní") || l.status.toLowerCase().includes("nový")
  ).length;

  const leadsByStatus = leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.status || "Neznámý";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Top makléři podle leadů
  const leadsByMakler = leads.reduce<Record<string, number>>((acc, l) => {
    const m = l.makler || "Neznámý";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const topMakleri = Object.entries(leadsByMakler)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    clients: {
      total: clients.length,
      newThisMonth: newClientsThisMonth,
      bySource: clientsBySource,
    },
    properties: {
      total: properties.length,
      forSale,
      missingRekonstrukce,
      avgPrice,
    },
    leads: {
      total: leads.length,
      active: activeLeads,
      byMonth: leadsByMonth,
      byStatus: leadsByStatus,
      topMakleri,
    },
  });
}
