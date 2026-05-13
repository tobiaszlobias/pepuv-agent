"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { getCached, setCached } from "@/lib/cache";

interface DashboardData {
  clients: {
    total: number;
    newThisMonth: number;
    bySource: Record<string, number>;
  };
  properties: {
    total: number;
    forSale: number;
    missingRekonstrukce: number;
    avgPrice: number;
  };
  leads: {
    total: number;
    active: number;
    dates: string[];
    byStatus: Record<string, number>;
    topMakleri: { name: string; count: number }[];
  };
}

interface SrealityListing {
  address: string;
  price: number;
  type: string;
  url: string;
  description: string;
  scraped_at: string;
}

const YELLOW = "#FFD600";
const COLORS = ["#FFD600", "#888880", "#F0EDE8", "#444440", "#BBBAB6"];

type TimeSlot = "3m" | "6m" | "12m" | "all";

const TIME_SLOTS: { label: string; value: TimeSlot }[] = [
  { label: "3 měs", value: "3m" },
  { label: "6 měs", value: "6m" },
  { label: "12 měs", value: "12m" },
  { label: "Vše", value: "all" },
];

function buildChartData(dates: string[], slot: TimeSlot) {
  const now = new Date();
  let cutoff: Date | null = null;
  if (slot === "3m") cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  else if (slot === "6m") cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  else if (slot === "12m") cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const filtered = cutoff
    ? dates.filter((d) => new Date(d) >= cutoff!)
    : dates;

  // Group by month
  const map: Record<string, number> = {};
  filtered.forEach((d) => {
    const date = new Date(d);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    map[key] = (map[key] || 0) + 1;
  });

  // Fill all months in range
  const sorted = Object.keys(map).sort();
  if (sorted.length === 0) return [];

  const start = new Date(sorted[0] + "-01");
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const result: { month: string; count: number }[] = [];

  const cur = new Date(start);
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const label = cur.toLocaleString("cs-CZ", { month: "short", year: cur.getFullYear() !== now.getFullYear() ? "2-digit" : undefined });
    result.push({ month: label, count: map[key] || 0 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

function KpiCard({ label, value, sub, highlight }: {
  label: string; value: string | number; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-3xl font-bold leading-none" style={{ color: highlight ? YELLOW : "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function formatPrice(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M Kč`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} tis. Kč`;
  return `${n} Kč`;
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(getCached<DashboardData>("dashboard"));
  const [sreality, setSreality] = useState<SrealityListing[]>(getCached<SrealityListing[]>("sreality_latest") ?? []);
  const [loadingData, setLoadingData] = useState(data === null);
  const [loadingSreality, setLoadingSreality] = useState(false);
  const [srealityError, setSrealityError] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("6m");

  useEffect(() => {
    if (data !== null) return;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d: DashboardData) => { setCached("dashboard", d); setData(d); setLoadingData(false); })
      .catch(() => setLoadingData(false));
  }, []);

  function runSreality() {
    setLoadingSreality(true);
    setSrealityError("");
    fetch("/api/sreality/scan")
      .then((r) => r.json())
      .then((d: { listings: SrealityListing[] }) => {
        setCached("sreality_latest", d.listings);
        setSreality(d.listings);
        setLoadingSreality(false);
      })
      .catch(() => { setSrealityError("Scan selhal, zkus to znovu."); setLoadingSreality(false); });
  }

  const chartData = useMemo(
    () => data ? buildChartData(data.leads.dates, timeSlot) : [],
    [data, timeSlot]
  );

  if (loadingData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ background: YELLOW }} />
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ background: YELLOW }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: YELLOW }} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sourceData = Object.entries(data.clients.bySource).map(([name, value]) => ({ name, value }));
  const statusData = Object.entries(data.leads.byStatus).map(([name, value]) => ({ name, value }));
  const totalInSlot = chartData.reduce((a, b) => a + b.count, 0);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5" style={{ background: "var(--bg)" }}>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard
          label="Klienti celkem"
          value={data.clients.total}
          sub={`+${data.clients.newThisMonth} tento měsíc`}
          highlight={data.clients.newThisMonth > 0}
        />
        <KpiCard
          label="Aktivní leady"
          value={data.leads.active}
          sub={`z ${data.leads.total} celkem`}
        />
        <KpiCard
          label="Nemovitosti"
          value={data.properties.total}
          sub={`${data.properties.missingRekonstrukce} bez roku rekonstrukce`}
        />
        <KpiCard
          label="Průměrná cena"
          value={data.properties.avgPrice > 0 ? formatPrice(data.properties.avgPrice) : "—"}
          sub="nemovitosti v portfoliu"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-5">

        {/* Area chart leadů */}
        <div className="col-span-2">
          <Section
            title={`Leady — ${totalInSlot} celkem`}
            action={
              <div className="flex gap-1">
                {TIME_SLOTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setTimeSlot(s.value)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                    style={
                      timeSlot === s.value
                        ? { background: YELLOW, color: "#000", fontWeight: 600 }
                        : { background: "var(--surface-elevated)", color: "var(--muted)", border: "1px solid var(--border)" }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={YELLOW} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={YELLOW} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  allowDecimals={false}
                  tickCount={5}
                />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--text)" }}
                  itemStyle={{ color: YELLOW }}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                />
                <Area
                  type="linear"
                  dataKey="count"
                  stroke={YELLOW}
                  strokeWidth={2}
                  fill="url(#leadGradient)"
                  name="Leady"
                  dot={false}
                  activeDot={{ r: 4, fill: YELLOW, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Klienti podle zdroje */}
        <Section title="Klienti podle zdroje">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: "var(--text)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-2">
            {sourceData.slice(0, 4).map((s, i) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span style={{ color: "var(--muted)" }}>{s.name}</span>
                <span className="ml-auto font-bold" style={{ color: "var(--text)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Top makléři */}
        <Section title="Top makléři — leady">
          <div className="flex flex-col gap-2">
            {data.leads.topMakleri.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: i === 0 ? YELLOW : "var(--surface-elevated)", color: i === 0 ? "#000" : "var(--muted)" }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm truncate" style={{ color: "var(--text)" }}>{m.name}</span>
                <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>{m.count}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Status leadů */}
        <Section title="Leady podle statusu">
          <div className="flex flex-col gap-2">
            {statusData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 truncate" style={{ color: "var(--muted)" }}>{s.name}</span>
                <span className="font-bold" style={{ color: "var(--text)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Sreality scan */}
        <Section title="Sreality — Praha Holešovice">
          {sreality.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: "var(--muted)" }}>Poslední scan ještě neproběhl nebo nebyl uložen.</p>
              {srealityError && <p className="text-xs" style={{ color: "var(--error)" }}>{srealityError}</p>}
              <button
                onClick={runSreality}
                disabled={loadingSreality}
                className="text-xs px-3 py-2 rounded-lg font-bold transition-opacity disabled:opacity-40"
                style={{ background: YELLOW, color: "#000" }}
              >
                {loadingSreality ? "Scanuji..." : "Spustit scan"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "var(--muted)" }}>{sreality.length} nabídek</span>
                <button
                  onClick={runSreality}
                  disabled={loadingSreality}
                  className="text-xs px-2 py-1 rounded-lg font-bold transition-opacity disabled:opacity-40"
                  style={{ background: "var(--surface-elevated)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  {loadingSreality ? "..." : "Obnovit"}
                </button>
              </div>
              {sreality.slice(0, 4).map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg px-3 py-2 text-xs transition-colors"
                  style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = YELLOW)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div className="font-bold truncate" style={{ color: "var(--text)" }}>{l.description || l.address}</div>
                  <div className="flex justify-between mt-0.5">
                    <span style={{ color: "var(--muted)" }}>{l.address}</span>
                    <span style={{ color: YELLOW }}>{l.price > 0 ? formatPrice(l.price) : "—"}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
