"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  data: Record<string, unknown>[];
  x_key?: string;
  y_key?: string;
}

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#ddd6fe",
  "#818cf8",
  "#4f46e5",
];

export function AgentChart({ chart, dark }: { chart: ChartData; dark: boolean }) {
  const xKey = chart.x_key || "name";
  const yKey = chart.y_key || "value";

  const gridColor = dark ? "#374151" : "#f0f0f0";
  const axisColor = dark ? "#6b7280" : "#9ca3af";
  const tooltipStyle = dark
    ? { borderRadius: "8px", border: "1px solid #374151", fontSize: "12px", backgroundColor: "#1f2937", color: "#f9fafb" }
    : { borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" };

  return (
    <div className={`rounded-xl border p-4 my-2 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
      <h3 className={`text-sm font-semibold mb-3 ${dark ? "text-gray-100" : "text-gray-800"}`}>{chart.title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        {chart.type === "bar" ? (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: axisColor }} stroke={axisColor} />
            <YAxis tick={{ fontSize: 12, fill: axisColor }} stroke={axisColor} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey={yKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chart.type === "line" ? (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: axisColor }} stroke={axisColor} />
            <YAxis tick={{ fontSize: 12, fill: axisColor }} stroke={axisColor} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: "#6366f1", r: 4 }}
            />
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey={yKey}
              nameKey={xKey}
            >
              {chart.data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
