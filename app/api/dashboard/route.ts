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

  // Leady — všechna data pro client-side timeslot picker
  const leadDates = leads
    .filter((l) => !!l.datum)
    .map((l) => l.datum)
    .sort();

  const activeLeads = leads.filter((l) => {
    const s = l.status.toLowerCase();
    return !s.includes("uzavř") && !s.includes("ztrace") && s !== "";
  }).length;

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

  const clientDates = clients
    .filter((c) => !!c.datum_pridani)
    .map((c) => c.datum_pridani)
    .sort();

  const propertyDates = properties
    .filter((p) => !!p.datum_pridani)
    .map((p) => p.datum_pridani)
    .sort();

  return NextResponse.json({
    clients: {
      total: clients.length,
      newThisMonth: newClientsThisMonth,
      bySource: clientsBySource,
      dates: clientDates,
    },
    properties: {
      total: properties.length,
      forSale,
      missingRekonstrukce,
      avgPrice,
      dates: propertyDates,
    },
    leads: {
      total: leads.length,
      active: activeLeads,
      dates: leadDates,
      byStatus: leadsByStatus,
      topMakleri,
    },
  });
}
