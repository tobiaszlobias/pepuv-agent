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
    dates?: string[];
  };
  properties: {
    total: number;
    forSale: number;
    missingRekonstrukce: number;
    avgPrice: number;
    dates?: string[];
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

interface MonitoringConfig {
  locality: string;
  propertyType: string;
  maxPrice: string;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  locality: "Praha Holešovice",
  propertyType: "",
  maxPrice: "",
};

const PROPERTY_TYPES = [
  { value: "", label: "Jakýkoliv typ" },
  { value: "byt", label: "Byt" },
  { value: "dům", label: "Dům" },
  { value: "kancelář", label: "Kancelář" },
  { value: "pozemek", label: "Pozemek" },
];

function loadMonitoringConfig(): MonitoringConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem("monitoring_config");
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveMonitoringConfig(cfg: MonitoringConfig) {
  localStorage.setItem("monitoring_config", JSON.stringify(cfg));
}

const YELLOW = "#FFD600";
const COLORS = ["#FFD600", "#888880", "#F0EDE8", "#444440", "#BBBAB6"];

// Sémantické barvy pro statusy leadů
const STATUS_COLORS: Record<string, string> = {
  prohlídka:   "#FFD600", // žlutá — akce
  nabídka:     "#60a5fa", // modrá — v jednání
  nový:        "#a78bfa", // fialová — vstup
  kontaktován: "#34d399", // zelená — progress
  uzavřen:     "#4ade80", // světle zelená — win
  ztracen:     "#f87171", // červená — lost
};

// Barvy pro zdroje klientů
const SOURCE_COLORS: Record<string, string> = {
  inzerce:     "#FFD600",
  doporučení:  "#60a5fa",
  sreality:    "#a78bfa",
  web:         "#34d399",
};

function getStatusColor(name: string): string {
  return STATUS_COLORS[name.toLowerCase()] ?? "#888880";
}
function getSourceColor(name: string, index: number): string {
  return SOURCE_COLORS[name.toLowerCase()] ?? COLORS[index % COLORS.length];
}

type TimeSlot = "3m" | "6m" | "12m" | "all";
type ChartMetric = "leady" | "nemovitosti" | "klienti";

const TIME_SLOTS: { label: string; value: TimeSlot }[] = [
  { label: "3 měs", value: "3m" },
  { label: "6 měs", value: "6m" },
  { label: "12 měs", value: "12m" },
  { label: "Vše", value: "all" },
];

const METRIC_LABELS: Record<ChartMetric, string> = {
  leady: "Leady",
  nemovitosti: "Nemovitosti",
  klienti: "Klienti",
};

function buildChartData(dates: string[], slot: TimeSlot) {
  const now = new Date();
  let cutoff: Date | null = null;
  if (slot === "3m") cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  else if (slot === "6m") cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  else if (slot === "12m") cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const filtered = cutoff
    ? dates.filter((d) => new Date(d) >= cutoff!)
    : dates;

  const map: Record<string, number> = {};
  filtered.forEach((d) => {
    const date = new Date(d);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    map[key] = (map[key] || 0) + 1;
  });

  const sorted = Object.keys(map).sort();
  if (sorted.length === 0) return [];

  const start = new Date(sorted[0] + "-01");
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const result: { month: string; count: number }[] = [];

  const cur = new Date(start);
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const label = cur.toLocaleString("cs-CZ", { month: "short", year: "2-digit" });
    result.push({ month: label, count: map[key] || 0 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

function useCountUp(target: number, duration = 900) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return current;
}

function KpiCard({ label, value, sub, highlight }: {
  label: string; value: string | number; sub?: string; highlight?: boolean;
}) {
  const isNumeric = typeof value === "number";
  const animated = useCountUp(isNumeric ? (value as number) : 0);

  // For price strings like "9.7 M Kč" — animate the numeric prefix
  let display: React.ReactNode = value;
  if (isNumeric) {
    display = animated;
  } else if (typeof value === "string") {
    const match = value.match(/^([\d.]+)(.*)$/);
    if (match) {
      const numTarget = parseFloat(match[1]);
      display = <AnimatedFloat target={numTarget} suffix={match[2]} />;
    }
  }

  return (
    <div className="rounded-xl md:rounded-2xl p-4 md:p-5 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl md:text-3xl font-bold leading-none" style={{ color: highlight ? YELLOW : "var(--text)" }}>{display}</p>
      {sub && <p className="text-[10px] md:text-xs mt-1" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  );
}

function AnimatedFloat({ target, suffix }: { target: number; suffix: string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    const start = performance.now();
    const duration = 900;
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(parseFloat((eased * target).toFixed(1)));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{current}{suffix}</>;
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
  const [srealityScanned, setSrealityScanned] = useState(false);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("6m");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("leady");

  const [config, setConfig] = useState<MonitoringConfig>(DEFAULT_CONFIG);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MonitoringConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const loaded = loadMonitoringConfig();
    setConfig(loaded);
    setDraft(loaded);
  }, []);

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
    const params = new URLSearchParams();
    params.set("locality", config.locality || "Praha Holešovice");
    if (config.propertyType) params.set("type", config.propertyType);
    if (config.maxPrice) params.set("maxPrice", config.maxPrice);
    fetch(`/api/sreality/scan?${params}`)
      .then((r) => r.json())
      .then((d: { listings: SrealityListing[] }) => {
        setCached("sreality_latest", d.listings);
        setSreality(d.listings);
        setSrealityScanned(true);
        setLoadingSreality(false);
      })
      .catch(() => { setSrealityError("Scan selhal, zkus to znovu."); setLoadingSreality(false); });
  }

  function saveConfig() {
    setConfig(draft);
    saveMonitoringConfig(draft);
    setEditing(false);
    // Clear old results when config changes
    setSreality([]);
    setCached("sreality_latest", null);
  }

  const chartData = useMemo(() => {
    if (!data) return [];
    const dates =
      chartMetric === "leady" ? data.leads.dates :
      chartMetric === "klienti" ? data.clients.dates ?? [] :
      data.properties.dates ?? [];
    return buildChartData(dates, timeSlot);
  }, [data, timeSlot, chartMetric]);

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
  const isEmpty = chartData.length === 0 || chartData.every((d) => d.count === 0);

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 md:py-5 flex flex-col gap-3 md:gap-4"
      style={{
        background: "var(--bg)",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">

        {/* Area chart */}
        <div className="md:col-span-2">
          <Section
            title={`${METRIC_LABELS[chartMetric]} — ${totalInSlot} celkem`}
            action={
              <div className="flex items-center gap-2">
                {/* Metric switcher */}
                <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                  {(Object.keys(METRIC_LABELS) as ChartMetric[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setChartMetric(m)}
                      className="text-xs px-2 py-1 rounded-md transition-colors"
                      style={
                        chartMetric === m
                          ? { background: "var(--surface)", color: "var(--text)", fontWeight: 600 }
                          : { color: "var(--muted)" }
                      }
                    >
                      {METRIC_LABELS[m]}
                    </button>
                  ))}
                </div>
                {/* Time slot */}
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
              </div>
            }
          >
            {isEmpty ? (
              <div className="flex items-center justify-center" style={{ height: 240 }}>
                <p className="text-sm" style={{ color: "var(--muted)" }}>Žádné záznamy v tomto období</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart key={`${chartMetric}-${timeSlot}`} data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
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
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </Section>
        </div>

        {/* Klienti podle zdroje */}
        <Section title="Klienti podle zdroje">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={0} dataKey="value" strokeWidth={0}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--text)" }}
                itemStyle={{ color: "var(--muted)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-2">
            {sourceData.map((s, i) => (
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 pb-4 md:pb-2">

        {/* Top makléři */}
        <Section title="Top makléři — leady">
          {(() => {
            const maxCount = data.leads.topMakleri[0]?.count || 1;
            const totalLeads = data.leads.total || 1;
            const closedCount = data.leads.byStatus["uzavřen"] ?? 0;
            return (
              <div className="flex flex-col gap-3">
                {data.leads.topMakleri.map((m, i) => {
                  const share = Math.round((m.count / totalLeads) * 100);
                  const barW = Math.round((m.count / maxCount) * 100);
                  return (
                    <div key={m.name} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: i === 0 ? YELLOW : "var(--surface-elevated)", color: i === 0 ? "#000" : "var(--muted)" }}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm truncate" style={{ color: "var(--text)" }}>{m.name}</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: "var(--muted)" }}>{m.count} <span style={{ color: "var(--border)" }}>·</span> {share}%</span>
                      </div>
                      <div className="ml-7 h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-elevated)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barW}%`, background: i === 0 ? YELLOW : "var(--muted)" }} />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-1 pt-2 flex items-center justify-between text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}>
                  <span>Uzavřeno celkem</span>
                  <span className="font-bold" style={{ color: YELLOW }}>{closedCount} obchodů</span>
                </div>
              </div>
            );
          })()}
        </Section>

        {/* Status leadů */}
        <Section title="Leady podle statusu">
          {(() => {
            const total = statusData.reduce((a, b) => a + b.value, 0) || 1;
            return (
              <div className="flex flex-col gap-2.5">
                {statusData.map((s) => {
                  const pct = Math.round((s.value / total) * 100);
                  return (
                    <div key={s.name} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getStatusColor(s.name) }} />
                        <span className="flex-1 truncate" style={{ color: "var(--muted)" }}>{s.name}</span>
                        <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>{pct}%</span>
                        <span className="font-bold w-5 text-right" style={{ color: "var(--text)" }}>{s.value}</span>
                      </div>
                      <div className="ml-4 h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-elevated)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: getStatusColor(s.name), opacity: 0.7 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Section>

        {/* Monitoring panel */}
        <Section
          title="Ranní monitoring"
          action={
            !editing ? (
              <button
                onClick={() => { setDraft(config); setEditing(true); }}
                className="text-xs px-2 py-1 rounded-lg transition-opacity"
                style={{ background: "var(--surface-elevated)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                Upravit
              </button>
            ) : null
          }
        >
          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--muted)" }}>Lokalita</label>
                <input
                  type="text"
                  value={draft.locality}
                  onChange={(e) => setDraft({ ...draft, locality: e.target.value })}
                  placeholder="Praha Holešovice"
                  className="text-xs px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = YELLOW)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--muted)" }}>Typ nemovitosti</label>
                <select
                  value={draft.propertyType}
                  onChange={(e) => setDraft({ ...draft, propertyType: e.target.value })}
                  className="text-xs px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--muted)" }}>Max cena (Kč)</label>
                <input
                  type="number"
                  value={draft.maxPrice}
                  onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
                  placeholder="bez limitu"
                  className="text-xs px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = YELLOW)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={saveConfig}
                  className="flex-1 text-xs py-2 rounded-lg font-bold"
                  style={{ background: YELLOW, color: "#000" }}
                >
                  Uložit
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: "var(--surface-elevated)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  Zrušit
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Current config summary */}
              <div className="rounded-lg px-3 py-2.5 flex flex-col gap-1.5" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: "var(--muted)" }}>Lokalita</span>
                  <span className="ml-auto font-medium truncate" style={{ color: "var(--text)" }}>{config.locality || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: "var(--muted)" }}>Typ</span>
                  <span className="ml-auto font-medium" style={{ color: "var(--text)" }}>
                    {PROPERTY_TYPES.find(t => t.value === config.propertyType)?.label || "Jakýkoliv typ"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: "var(--muted)" }}>Max cena</span>
                  <span className="ml-auto font-medium" style={{ color: "var(--text)" }}>
                    {config.maxPrice ? formatPrice(Number(config.maxPrice)) : "bez limitu"}
                  </span>
                </div>
              </div>

              {/* Scan results or empty */}
              {sreality.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{sreality.length} nabídek · {config.locality}</span>
                    <button
                      onClick={runSreality}
                      disabled={loadingSreality}
                      className="text-xs px-2 py-1 rounded-lg font-medium transition-opacity disabled:opacity-40"
                      style={{ background: "var(--surface-elevated)", color: "var(--text)", border: "1px solid var(--border)" }}
                    >
                      {loadingSreality ? "..." : "Obnovit"}
                    </button>
                  </div>
                  {sreality.slice(0, 3).map((l, i) => (
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
                      <div className="font-medium truncate" style={{ color: "var(--text)" }}>{l.description || l.address}</div>
                      <div className="flex justify-between mt-0.5">
                        <span style={{ color: "var(--muted)" }} className="truncate max-w-[60%]">{l.address}</span>
                        <span style={{ color: YELLOW }}>{l.price > 0 ? formatPrice(l.price) : "—"}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {srealityError && <p className="text-xs" style={{ color: "var(--error)" }}>{srealityError}</p>}
                  {srealityScanned && !srealityError && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Pro lokalitu „{config.locality}" nebyly nalezeny žádné nabídky. Zkus širší lokalitu.
                    </p>
                  )}
                  {!srealityScanned && !srealityError && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Automaticky každé ráno v 7:00. Nebo spusť ručně:
                    </p>
                  )}
                  <button
                    onClick={runSreality}
                    disabled={loadingSreality}
                    className="w-full text-xs py-2 rounded-lg font-bold transition-opacity disabled:opacity-40"
                    style={{ background: YELLOW, color: "#000" }}
                  >
                    {loadingSreality ? "Scanuji..." : srealityScanned ? "Zkusit znovu" : "Spustit scan"}
                  </button>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
