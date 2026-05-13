"use client";

import {
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  data: Record<string, unknown>[];
  x_key?: string;
  y_key?: string;
  horizontal?: boolean;
  // Agent může přidat referenční čáru (průměr apod.)
  reference_line?: { value: number; label: string };
  // Agent může přidat legendu pro barevné zóny
  color_legend?: { color: string; label: string }[];
}

// Barvy pro agent-řízené zóny (pole "color" v datovém bodě)
const ZONE_COLORS: Record<string, string> = {
  green:  "#4ade80",
  yellow: "#F5A623",
  red:    "#f87171",
  blue:   "#60a5fa",
  gray:   "#888880",
};

// Fallback paleta pro pie a bar bez zón — žlutá + neutrální
const PIE_COLORS  = ["#FFD600", "#888880", "#F0EDE8", "#444440", "#BBBAB6", "#555550"];
const YELLOW = "#FFD600";

function formatYTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

function formatTooltipValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} M Kč`;
  if (value >= 1_000) return `${value.toLocaleString("cs-CZ")} Kč`;
  return String(value);
}

function getYAxisWidth(data: Record<string, unknown>[], yKey: string): number {
  const max = Math.max(...data.map((d) => Number(d[yKey]) || 0));
  if (max >= 1_000_000) return 52;
  if (max >= 10_000)    return 44;
  return 34;
}

function hasLongXLabels(data: Record<string, unknown>[], xKey: string): boolean {
  return data.some((d) => String(d[xKey] || "").length > 12);
}

function getCellColor(item: Record<string, unknown>, index: number): string {
  const zone = item.color as string | undefined;
  if (zone && ZONE_COLORS[zone]) return ZONE_COLORS[zone];
  // Fallback: odstíny žluté podle indexu
  const shades = ["#FFD600", "#E8C200", "#D0AD00", "#B89800", "#A08400", "#886F00", "#705B00"];
  return shades[index % shades.length];
}

export function AgentChart({ chart }: { chart: ChartData }) {
  const xKey = chart.x_key || "name";
  const yKey = chart.y_key || "value";
  const isHorizontal = chart.horizontal ?? false;
  const yWidth = getYAxisWidth(chart.data, yKey);
  const longLabels = hasLongXLabels(chart.data, xKey);

  const horizontalHeight = Math.max(220, Math.min(600, chart.data.length * 32));
  const hasZones = chart.data.some((d) => d.color);

  const tooltipStyle = {
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontSize: "12px",
    backgroundColor: "var(--surface-elevated)",
    color: "var(--text)",
  };

  const tooltipLabelStyle = { color: "var(--text)", fontWeight: 500 };
  const tooltipItemStyle = { color: "var(--muted)" };

  const xAxisProps = longLabels && !isHorizontal
    ? { tick: { fontSize: 10, fill: "var(--muted)" }, axisLine: false, tickLine: false, angle: -35, textAnchor: "end" as const, height: 60, interval: 0 }
    : { tick: { fontSize: 11, fill: "var(--muted)" }, axisLine: false, tickLine: false };

  return (
    <div
      className="rounded-xl p-4 my-2"
      style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
        {chart.title}
      </p>

      {/* Legenda barevných zón */}
      {(chart.color_legend || hasZones) && (
        <div className="flex flex-wrap gap-3 mb-3 mt-1">
          {(chart.color_legend ?? Object.entries(
            chart.data.reduce<Record<string, string>>((acc, d) => {
              if (d.color && d.zone_label) acc[d.color as string] = d.zone_label as string;
              return acc;
            }, {})
          ).map(([color, label]) => ({ color, label }))).map((item) => (
            <div key={item.color} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: ZONE_COLORS[item.color] ?? item.color }} />
              {item.label}
            </div>
          ))}
          {chart.reference_line && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <span className="w-4 border-t border-dashed flex-shrink-0" style={{ borderColor: "var(--muted)" }} />
              {chart.reference_line.label}
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={isHorizontal ? horizontalHeight : (longLabels ? 260 : 220)}>
        {chart.type === "bar" ? (
          isHorizontal ? (
            <BarChart data={chart.data} layout="vertical" margin={{ top: 4, right: 52, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={formatYTick} allowDecimals={false} />
              <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={150} />
              {chart.reference_line && (
                <ReferenceLine x={chart.reference_line.value} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1.5} />
              )}
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "var(--border)", opacity: 0.25 }} formatter={(value: unknown) => [formatTooltipValue(Number(value)), null]} />
              <Bar dataKey={yKey} radius={[0, 4, 4, 0]}>
                {chart.data.map((item, i) => <Cell key={i} fill={getCellColor(item, i)} />)}
                <LabelList dataKey={yKey} position="right" style={{ fontSize: 10, fill: "var(--muted)" }} formatter={(v: unknown) => formatYTick(Number(v))} />
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={chart.data} margin={{ top: 4, right: 8, left: 4, bottom: longLabels ? 8 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey={xKey} {...xAxisProps} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={yWidth} allowDecimals={false} tickFormatter={formatYTick} />
              {chart.reference_line && (
                <ReferenceLine y={chart.reference_line.value} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: chart.reference_line.label, position: "insideTopRight", fontSize: 10, fill: "var(--muted)" }} />
              )}
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "var(--border)", opacity: 0.4 }} formatter={(value: unknown) => [formatTooltipValue(Number(value)), null]} />
              <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
                {chart.data.map((item, i) => <Cell key={i} fill={getCellColor(item, i)} />)}
              </Bar>
            </BarChart>
          )
        ) : chart.type === "line" ? (
          <AreaChart data={chart.data} margin={{ top: 4, right: 8, left: 4, bottom: longLabels ? 8 : 0 }}>
            <defs>
              <linearGradient id={`areaGrad-${chart.title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={YELLOW} stopOpacity={0.18} />
                <stop offset="95%" stopColor={YELLOW} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey={xKey} {...xAxisProps} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={yWidth} allowDecimals={false} tickFormatter={formatYTick} />
            {chart.reference_line && (
              <ReferenceLine y={chart.reference_line.value} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: chart.reference_line.label, position: "insideTopRight", fontSize: 10, fill: "var(--muted)" }} />
            )}
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} formatter={(value: unknown) => [formatTooltipValue(Number(value)), null]} />
            <Area type="linear" dataKey={yKey} stroke={YELLOW} strokeWidth={2} fill={`url(#areaGrad-${chart.title})`} dot={false} activeDot={{ r: 4, fill: YELLOW, strokeWidth: 0 }} animationDuration={500} animationEasing="ease-out" />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie data={chart.data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey={yKey} nameKey={xKey}>
              {chart.data.map((item, i) => (
                <Cell key={i} fill={hasZones ? (getCellColor(item, i)) : PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(value: unknown) => [formatTooltipValue(Number(value)), null]} />
            <Legend wrapperStyle={{ fontSize: "12px" }} formatter={(value) => <span style={{ color: "var(--text)" }}>{value}</span>} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
