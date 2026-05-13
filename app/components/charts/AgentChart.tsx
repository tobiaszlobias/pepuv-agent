"use client";

import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  data: Record<string, unknown>[];
  x_key?: string;
  y_key?: string;
}

const YELLOW = "#FFD600";
const COLORS = ["#FFD600", "#888880", "#F0EDE8", "#444440", "#BBBAB6", "#555550", "#CCCC00"];

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
  if (max >= 1_000_000) return 48;
  if (max >= 10_000) return 42;
  return 32;
}

function hasLongXLabels(data: Record<string, unknown>[], xKey: string): boolean {
  return data.some((d) => String(d[xKey] || "").length > 10);
}

export function AgentChart({ chart }: { chart: ChartData }) {
  const xKey = chart.x_key || "name";
  const yKey = chart.y_key || "value";

  const longLabels = hasLongXLabels(chart.data, xKey);
  const yWidth = getYAxisWidth(chart.data, yKey);

  const tooltipStyle = {
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontSize: "12px",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
  };

  const yAxisProps = {
    tick: { fontSize: 11, fill: "var(--muted)" },
    axisLine: false,
    tickLine: false,
    width: yWidth,
    allowDecimals: false,
    tickFormatter: formatYTick,
  };

  const xAxisProps = longLabels
    ? {
        tick: { fontSize: 10, fill: "var(--muted)" },
        axisLine: false,
        tickLine: false,
        angle: -35,
        textAnchor: "end" as const,
        height: 60,
        interval: 0,
      }
    : {
        tick: { fontSize: 11, fill: "var(--muted)" },
        axisLine: false,
        tickLine: false,
      };

  return (
    <div
      className="rounded-xl p-4 my-2"
      style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
        {chart.title}
      </p>
      <ResponsiveContainer width="100%" height={longLabels ? 260 : 220}>
        {chart.type === "bar" ? (
          <BarChart data={chart.data} margin={{ top: 4, right: 8, left: 4, bottom: longLabels ? 8 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey={xKey} {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--border)", opacity: 0.4 }}
              formatter={(value: unknown) => [formatTooltipValue(Number(value)), ""]}
            />
            <Bar dataKey={yKey} fill={YELLOW} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chart.type === "line" ? (
          <LineChart data={chart.data} margin={{ top: 4, right: 8, left: 4, bottom: longLabels ? 8 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey={xKey} {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              formatter={(value: unknown) => [formatTooltipValue(Number(value)), ""]}
            />
            <Line
              type="linear"
              dataKey={yKey}
              stroke={YELLOW}
              strokeWidth={2}
              dot={{ fill: YELLOW, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: YELLOW, strokeWidth: 0 }}
            />
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey={yKey}
              nameKey={xKey}
            >
              {chart.data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown) => [formatTooltipValue(Number(value)), ""]}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "var(--muted)" }}
              formatter={(value) => <span style={{ color: "var(--text)" }}>{value}</span>}
            />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
