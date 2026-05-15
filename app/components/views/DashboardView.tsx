"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
  price_per_m2?: number;
  area_m2?: number;
  type: string;
  url: string;
  description: string;
  scraped_at: string;
}

interface MonitoringConfig {
  locality: string;
  propertyType: string;
  maxPrice: string;
  cronHour: string;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  locality: "Praha Holešovice",
  propertyType: "",
  maxPrice: "",
  cronHour: "7",
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

function InlineTextInput({ defaultValue, placeholder, yellow, inputMode, onCommit, onCancel }: {
  defaultValue: string;
  placeholder?: string;
  yellow?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      type="text"
      inputMode={inputMode}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="text-xs px-2.5 py-1 rounded-full focus:outline-none"
      style={yellow
        ? { background: "rgba(255,214,0,0.15)", border: `1px solid ${YELLOW}`, color: YELLOW, minWidth: 120 }
        : { background: "var(--surface-elevated)", border: `1px solid ${YELLOW}`, color: "var(--text)", minWidth: 100 }
      }
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit(e.currentTarget.value);
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
    />
  );
}

// Sémantické barvy pro statusy leadů
const STATUS_COLORS: Record<string, string> = {
  prohlídka:   "#FFD600", // žlutá — akce
  nabídka:     "#60a5fa", // modrá — v jednání
  nový:        "#a78bfa", // fialová — vstup
  kontaktován: "#34d399", // zelená — progress
  uzavřen:     "#4ade80", // světle zelená — win
  ztracen:     "#f87171", // červená — lost
};

function getStatusColor(name: string): string {
  return STATUS_COLORS[name.toLowerCase()] ?? "#888880";
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

function Section({ title, children, action, titleNode, stackOnMobile, className }: { title: string; children: React.ReactNode; action?: React.ReactNode; titleNode?: React.ReactNode; stackOnMobile?: boolean; className?: string }) {
  return (
    <div className={`rounded-2xl p-4 md:p-5 ${className ?? ""}`} style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className={`flex ${stackOnMobile ? "flex-col gap-2" : "flex-wrap items-center justify-between gap-2"} mb-4 md:flex-row md:items-center md:justify-between`}>
        {titleNode
          ? titleNode
          : <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{title}</p>
        }
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

function ChartWithAdaptiveLabels({ chartData, chartMetric, timeSlot }: {
  chartData: { month: string; count: number }[];
  chartMetric: string;
  timeSlot: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(600);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const shortLabels = containerWidth < 400;
  const formatMonth = (val: string) => {
    if (!shortLabels) return val;
    const parts = val.split(" ");
    if (parts.length === 2) return parts[0].slice(0, 2) + parts[1];
    return val.slice(0, 4);
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart key={`${chartMetric}-${timeSlot}`} data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={YELLOW} stopOpacity={0.2} />
              <stop offset="95%" stopColor={YELLOW} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: shortLabels ? 10 : 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            tickFormatter={formatMonth}
            padding={{ left: 40, right: 20 }}
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
    </div>
  );
}

function isValidDashboardData(d: DashboardData | null): d is DashboardData {
  if (!d) return false;
  // Invalidate old cache that lacked dates arrays for clients/properties
  return Array.isArray(d.clients.dates) && Array.isArray(d.properties.dates);
}

export function DashboardView({ onChatPrompt }: { onChatPrompt?: (prompt: string) => void }) {
  const cached = getCached<DashboardData>("dashboard");
  const validCached = isValidDashboardData(cached) ? cached : null;
  const [data, setData] = useState<DashboardData | null>(validCached);
  const [sreality, setSreality] = useState<SrealityListing[]>(getCached<SrealityListing[]>("sreality_latest") ?? []);
  const [loadingData, setLoadingData] = useState(validCached === null);
  const [loadingSreality, setLoadingSreality] = useState(false);
  const [srealityError, setSrealityError] = useState("");
  const [srealityScanned, setSrealityScanned] = useState(false);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("6m");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("leady");

  const [config, setConfig] = useState<MonitoringConfig>(DEFAULT_CONFIG);
  const [showModal, setShowModal] = useState(false);
  // Inline editing state per field
  const [editingField, setEditingField] = useState<"locality" | "type" | "price" | "hour" | null>(null);

  useEffect(() => {
    const loaded = loadMonitoringConfig();
    setConfig(loaded);
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowModal(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showModal]);

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

  function applyField(field: keyof MonitoringConfig, value: string) {
    const next = { ...config, [field]: value };
    setConfig(next);
    saveMonitoringConfig(next);
    setEditingField(null);
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
  const totalInSlot = chartData.reduce((a, b) => a + b.count, 0);
  const isEmpty = chartData.length === 0 || chartData.every((d) => d.count === 0);

  return (
    <>
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

      {/* Proaktivní alert — chybějící data */}
      {data.properties.missingRekonstrukce > 0 && (
        <button
          onClick={() => onChatPrompt?.("Najdi nemovitosti, u kterých nám v systému chybí data o rekonstrukci a stavebních úpravách a připrav jejich seznam k doplnění.")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)")}
        >
          <span className="text-base flex-shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#f87171" }}>
              {data.properties.missingRekonstrukce} nemovitostí bez roku rekonstrukce
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Klikni pro zobrazení v chatu a přípravu seznamu k doplnění
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0" style={{ color: "#f87171" }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 md:items-stretch">

        {/* Area chart */}
        <div className="md:col-span-2 flex flex-col">
          <Section
            title=""
            stackOnMobile
            className="pb-1 flex-1"
            action={
              <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                {TIME_SLOTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setTimeSlot(s.value)}
                    className="text-xs px-2.5 py-1 rounded-md transition-colors"
                    style={
                      timeSlot === s.value
                        ? { background: YELLOW, color: "#000", fontWeight: 600 }
                        : { color: "var(--muted)" }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            }
            titleNode={
              <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                {(Object.keys(METRIC_LABELS) as ChartMetric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className="text-xs px-2.5 py-1 rounded-md transition-colors"
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
            }
          >
            {isEmpty ? (
              <div className="flex items-center justify-center" style={{ height: 240 }}>
                <p className="text-sm" style={{ color: "var(--muted)" }}>Žádné záznamy v tomto období</p>
              </div>
            ) : (
            <ChartWithAdaptiveLabels chartData={chartData} chartMetric={chartMetric} timeSlot={timeSlot} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-4 md:pb-2">

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
                  const isTop = i === 0;
                  return (
                    <div key={m.name} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: isTop ? YELLOW : "var(--surface-elevated)", color: isTop ? "#000" : "var(--muted)" }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate" style={{ color: "var(--text)" }}>{m.name}</div>
                          <div className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>{m.count} leadů</div>
                        </div>
                        <span
                          className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: isTop ? "rgba(255,214,0,0.15)" : "var(--surface-elevated)",
                            color: isTop ? YELLOW : "var(--muted)",
                          }}
                        >
                          {share}%
                        </span>
                      </div>
                      <div className="ml-7 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-elevated)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barW}%`, background: isTop ? YELLOW : "var(--muted)" }} />
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

        {/* Monitoring panel */}
        <Section title="Ranní monitoring">
          <div className="flex flex-col gap-3">
            {/* Description with cron time */}
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Každý den v{" "}
              {editingField === "hour" ? (
                <InlineTextInput
                  defaultValue={config.cronHour}
                  placeholder="7"
                  inputMode="numeric"
                  onCommit={(v) => {
                    const h = Math.max(0, Math.min(23, parseInt(v) || 7));
                    applyField("cronHour", String(h));
                  }}
                  onCancel={() => setEditingField(null)}
                />
              ) : (
                <button
                  onClick={() => setEditingField("hour")}
                  className="text-xs px-1.5 py-0.5 rounded font-medium transition-opacity hover:opacity-75"
                  style={{ background: "rgba(255,214,0,0.15)", color: YELLOW }}
                >
                  {config.cronHour}:00
                </button>
              )}{" "}
              automaticky sledujeme nové nabídky podle zadaných preferencí.
            </p>

            {/* Config pills — fixed row, never change layout */}
            <div className="relative">
              <div className="flex flex-wrap gap-1.5 items-center min-h-[28px]">
                {/* Locality */}
                {editingField === "locality" ? (
                  <InlineTextInput
                    defaultValue={config.locality}
                    placeholder="Praha Holešovice"
                    yellow
                    onCommit={(v) => applyField("locality", v)}
                    onCancel={() => setEditingField(null)}
                  />
                ) : (
                  <button
                    onClick={() => setEditingField("locality")}
                    className="text-xs px-2.5 py-1 rounded-full font-medium hover:opacity-75 transition-opacity"
                    style={{ background: "rgba(255,214,0,0.15)", color: YELLOW }}
                  >
                    {config.locality || "Lokalita"}
                  </button>
                )}

                {/* Property type pill */}
                <button
                  onClick={() => setEditingField(editingField === "type" ? null : "type")}
                  className="text-xs px-2.5 py-1 rounded-full hover:opacity-75 transition-opacity"
                  style={{
                    background: editingField === "type" ? "rgba(255,214,0,0.10)" : "var(--surface-elevated)",
                    color: editingField === "type" ? YELLOW : "var(--muted)",
                    border: `1px solid ${editingField === "type" ? YELLOW : "var(--border)"}`,
                  }}
                >
                  {PROPERTY_TYPES.find(t => t.value === config.propertyType)?.label || "Jakýkoliv typ"}
                </button>

                {/* Max price */}
                {editingField === "price" ? (
                  <InlineTextInput
                    defaultValue={config.maxPrice}
                    placeholder="bez limitu"
                    inputMode="numeric"
                    onCommit={(v) => applyField("maxPrice", v)}
                    onCancel={() => setEditingField(null)}
                  />
                ) : (
                  <button
                    onClick={() => setEditingField("price")}
                    className="text-xs px-2.5 py-1 rounded-full hover:opacity-75 transition-opacity"
                    style={{ background: "var(--surface-elevated)", color: "var(--muted)", border: "1px solid var(--border)" }}
                  >
                    {config.maxPrice ? `max ${formatPrice(Number(config.maxPrice))}` : "bez cenového limitu"}
                  </button>
                )}
              </div>
            </div>

            {/* Property type picker — inline, appears below pills */}
            {editingField === "type" && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {PROPERTY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => applyField("propertyType", t.value)}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors"
                    style={
                      config.propertyType === t.value
                        ? { background: YELLOW, color: "#000", fontWeight: 600 }
                        : { background: "var(--surface-elevated)", color: "var(--muted)", border: "1px solid var(--border)" }
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Loading skeleton */}
            {loadingSreality && (
              <div className="flex flex-col gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg animate-pulse"
                    style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: "var(--border)" }} />
                    <div className="flex-1 h-3 rounded" style={{ background: "var(--border)", opacity: 0.7 - i * 0.15 }} />
                    <div className="w-14 h-3 rounded flex-shrink-0" style={{ background: "var(--border)" }} />
                  </div>
                ))}
                <p className="text-[10px] text-center mt-0.5" style={{ color: "var(--muted)" }}>Prohledávám nabídky…</p>
              </div>
            )}

            {/* Results or scan button */}
            {!loadingSreality && sreality.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {[...sreality]
                  .sort((a, b) => (a.price_per_m2 ?? Infinity) - (b.price_per_m2 ?? Infinity))
                  .slice(0, 3)
                  .map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
                      style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = YELLOW)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: i === 0 ? YELLOW : "var(--surface)", color: i === 0 ? "#000" : "var(--muted)", border: i !== 0 ? "1px solid var(--border)" : "none" }}>
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate font-medium" style={{ color: "var(--text)" }}>
                        {l.address || l.description || "—"}
                      </span>
                      {l.price_per_m2 && (
                        <span className="flex-shrink-0 text-[10px]" style={{ color: "var(--muted)" }}>
                          {l.price_per_m2.toLocaleString("cs-CZ")} Kč/m²
                        </span>
                      )}
                      <span className="flex-shrink-0 font-semibold" style={{ color: YELLOW }}>
                        {l.price > 0 ? formatPrice(l.price) : "—"}
                      </span>
                    </a>
                  ))}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#4ade80" }}>✓ {sreality.length} nabídek</span>
                    <button
                      onClick={runSreality}
                      disabled={loadingSreality}
                      className="text-xs px-2 py-0.5 rounded-md transition-opacity disabled:opacity-40"
                      style={{ background: "var(--surface-elevated)", color: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      {loadingSreality ? "..." : "Obnovit"}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-xs px-2.5 py-1 rounded-md font-semibold"
                    style={{ background: YELLOW, color: "#000" }}
                  >
                    Všechny →
                  </button>
                </div>
              </div>
            ) : !loadingSreality ? (
              <div className="flex flex-col gap-2">
                {srealityError && <p className="text-xs" style={{ color: "#f87171" }}>{srealityError}</p>}
                {srealityScanned && !srealityError && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Pro lokalitu „{config.locality}" nebyly nalezeny žádné nabídky. Zkus širší lokalitu.
                  </p>
                )}
                <button
                  onClick={runSreality}
                  className="w-full text-xs py-2 rounded-lg font-bold"
                  style={{ background: YELLOW, color: "#000" }}
                >
                  {srealityScanned ? "Zkusit znovu" : "Spustit scan"}
                </button>
              </div>
            ) : null}
          </div>
        </Section>
      </div>
    </div>

    {/* Modal — výsledky monitoringu */}
    {showModal && (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-8"
        style={{ background: "rgba(0,0,0,0.75)" }}
        onClick={() => setShowModal(false)}
      >
        <div
          className="w-full max-w-3xl rounded-2xl flex flex-col overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "80vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                Výsledky monitoringu — {config.locality}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sreality.length} nabídek</p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "var(--surface-elevated)", color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              ✕
            </button>
          </div>
          {/* Modal body — table sorted by Kč/m² ascending (best value first) */}
          <div className="overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Adresa", "Typ", "Plocha", "Cena", "Kč/m²", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium uppercase tracking-wide text-[10px]" style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...sreality]
                  .sort((a, b) => (a.price_per_m2 ?? Infinity) - (b.price_per_m2 ?? Infinity))
                  .map((l, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--border)" }}
                      className="transition-colors hover:bg-[var(--surface-elevated)]"
                    >
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="truncate font-medium" style={{ color: "var(--text)" }}>{l.address || l.description || "—"}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                        {l.type || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                        {l.area_m2 ? `${l.area_m2} m²` : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold" style={{ color: YELLOW }}>
                        {l.price > 0 ? formatPrice(l.price) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                        {l.price_per_m2 ? `${l.price_per_m2.toLocaleString("cs-CZ")}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {l.url ? (
                          <a href={l.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded-md transition-colors"
                            style={{ background: "var(--surface-elevated)", color: "var(--muted)", border: "1px solid var(--border)" }}
                          >
                            Sreality ↗
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
