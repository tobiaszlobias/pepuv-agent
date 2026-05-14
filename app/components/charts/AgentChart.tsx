"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  data: Record<string, unknown>[];
  x_key?: string;
  y_key?: string;
  horizontal?: boolean;
  unit?: string; // "M Kč" → format as millions
  reference_line?: { value: number; label: string };
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

function formatPriceTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M Kč`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k Kč`;
  return String(value);
}

function isLikelyPrice(data: Record<string, unknown>[], key: string, unit?: string): boolean {
  if (unit?.includes("Kč") || unit?.includes("M")) return true;
  const vals = data.map((d) => Number(d[key] ?? 0)).filter((n) => n > 0);
  return vals.length > 0 && vals.every((v) => v >= 100_000);
}

function isMilions(data: Record<string, unknown>[], key: string, unit?: string): boolean {
  if (unit?.includes("M")) return true;
  const vals = data.map((d) => Number(d[key] ?? 0)).filter((n) => n > 0);
  // Values already in millions (1–100 range, all integers typical of M Kč)
  return vals.length > 0 && vals.every((v) => v >= 1 && v <= 200) && vals.some((v) => v >= 3);
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

export function AgentChart({ chart, index = 0 }: { chart: ChartData; index?: number }) {
  const xKey = chart.x_key || "name";
  const yKey = chart.y_key || "value";
  const gradientId = `areaGrad-${index}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Decide horizontal dynamically: switch when labels would overlap
  // Each label needs ~charWidth * labelLength px; if total exceeds container → go horizontal
  const charWidth = 7; // px per char at font-size 11px
  const maxLabelLen = Math.max(...chart.data.map((d) => String(d[xKey] ?? "").length));
  const labelWidthNeeded = maxLabelLen * charWidth;
  const slotWidth = chart.data.length > 0 ? (containerWidth - 60) / chart.data.length : 999;
  const labelsWouldOverlap = chart.type === "bar" && !chart.horizontal && slotWidth < labelWidthNeeded;

  const isHorizontal = (chart.horizontal ?? false) || labelsWouldOverlap;
  const yWidth = getYAxisWidth(chart.data, yKey);
  const longLabels = hasLongXLabels(chart.data, xKey);
  const priceChart = isHorizontal && isLikelyPrice(chart.data, yKey, chart.unit);
  const milionChart = priceChart && isMilions(chart.data, yKey, chart.unit);
  const tickFormatter = priceChart
    ? milionChart
      ? (v: number) => `${v}M Kč`
      : formatPriceTick
    : formatYTick;

  const horizontalHeight = chart.data.length * 28 + 100;
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

  // For line charts and bar charts with long labels: shorten tick text instead of rotating
  const needsShortLabels = longLabels && !isHorizontal;
  const shortTickFormatter = needsShortLabels
    ? (val: unknown) => {
        const s = String(val ?? "");
        // "Prosinec 2026" → "Pro 26", "Leden 2026" → "Led 26"
        const parts = s.split(" ");
        if (parts.length === 2 && parts[1].length === 4) {
          return `${parts[0].slice(0, 3)} ${parts[1].slice(2)}`;
        }
        return s.slice(0, 6);
      }
    : undefined;

  const xAxisProps = needsShortLabels
    ? { tick: { fontSize: 10, fill: "var(--muted)" }, axisLine: false, tickLine: false, tickFormatter: shortTickFormatter }
    : { tick: { fontSize: 11, fill: "var(--muted)" }, axisLine: false, tickLine: false };

  return (
    <div
      ref={containerRef}
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

      <ResponsiveContainer width="100%" height={chart.type === "pie" ? 200 : (isHorizontal ? horizontalHeight : (longLabels ? 260 : 220))}>
        {chart.type === "bar" ? (
          isHorizontal ? (
            <BarChart data={chart.data} layout="vertical" margin={{ top: 4, right: priceChart ? 80 : 52, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={tickFormatter} allowDecimals={false} />
              <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={150} />
              {chart.reference_line && (
                <ReferenceLine x={chart.reference_line.value} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1.5} />
              )}
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "var(--border)", opacity: 0.25 }} formatter={(value: unknown) => [milionChart ? `${Number(value)}M Kč` : priceChart ? formatPriceTick(Number(value)) : formatTooltipValue(Number(value)), null]} />
              <Bar dataKey={yKey} radius={[0, 4, 4, 0]} animationDuration={0}>
                {chart.data.map((item, i) => <Cell key={i} fill={getCellColor(item, i)} />)}
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
              <Bar dataKey={yKey} radius={[4, 4, 0, 0]} animationDuration={0}>
                {chart.data.map((item, i) => <Cell key={i} fill={getCellColor(item, i)} />)}
              </Bar>
            </BarChart>
          )
        ) : chart.type === "line" ? (
          <AreaChart data={chart.data} margin={{ top: 4, right: 8, left: 4, bottom: longLabels ? 8 : 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
            <Area type="linear" dataKey={yKey} stroke={YELLOW} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, fill: YELLOW, strokeWidth: 0 }} animationDuration={500} animationEasing="ease-out" />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie data={chart.data} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={0} dataKey={yKey} nameKey={xKey} strokeWidth={0}>
              {chart.data.map((item, i) => (
                <Cell key={i} fill={hasZones ? (getCellColor(item, i)) : PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(value: unknown) => [formatTooltipValue(Number(value)), null]} />
          </PieChart>
        )}
      </ResponsiveContainer>

      {chart.type === "pie" && (
        <div className="flex flex-col gap-1 mt-2">
          {chart.data.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: hasZones ? getCellColor(item, i) : PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span style={{ color: "var(--muted)" }}>{String(item[xKey] ?? "")}</span>
              <span className="ml-auto font-bold" style={{ color: "var(--text)" }}>
                {formatYTick(Number(item[yKey] ?? 0))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
