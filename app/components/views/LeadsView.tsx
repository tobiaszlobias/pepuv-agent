"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/app/components/DataTable";
import { getCached, setCached } from "@/lib/cache";

interface Lead {
  id: string;
  datum: string;
  zdroj: string;
  typ_nemovitosti: string;
  budget: string;
  status: string;
  makler: string;
}

function formatPrice(raw: string | undefined): string {
  if (!raw) return "—";
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M Kč`;
  return `${Math.round(n / 1_000)} tis. Kč`;
}

function formatDate(raw: string | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  aktivní: { bg: "rgba(255,214,0,0.15)",  color: "#FFD600" },
  nový:    { bg: "rgba(96,165,250,0.12)", color: "#60a5fa" },
  uzavřen: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
  zrušen:  { bg: "rgba(255,92,92,0.12)",  color: "#ff5c5c" },
};

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span style={{ color: "var(--muted)" }}>—</span>;
  const key = status.toLowerCase();
  const found = Object.keys(STATUS_COLORS).find((k) => key.includes(k));
  const style = found ? STATUS_COLORS[found] : { bg: "var(--surface-elevated)", color: "var(--muted)" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: style.bg, color: style.color }}
    >
      {status}
    </span>
  );
}

const COLUMNS = [
  { key: "datum",           label: "Datum",   render: (v: string | undefined) => <span style={{ color: "var(--muted)" }}>{formatDate(v)}</span> },
  { key: "zdroj",           label: "Zdroj" },
  { key: "typ_nemovitosti", label: "Typ" },
  { key: "budget",          label: "Budget",  render: (v: string | undefined) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatPrice(v)}</span> },
  { key: "status",          label: "Status",  render: (v: string | undefined) => <StatusBadge status={v} /> },
  { key: "makler",          label: "Makléř" },
];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

export function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    // Vždy načti čerstvá data (cache mohla být ze starého seedu)
    setLoading(true);
    fetch("/api/sheets/leads")
      .then((r) => r.json())
      .then((data: Lead[]) => { setCached("leads", data); setLeads(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const thisMonth = leads.filter((l) => {
    if (!l.datum) return false;
    const d = new Date(l.datum);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const aktivni = leads.filter((l) => {
    const s = l.status.toLowerCase();
    return !s.includes("uzavř") && !s.includes("ztrace") && s !== "";
  }).length;

  const budgets = leads.map((l) => parseInt(l.budget.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n) && n > 0);
  const avgBudget = budgets.length > 0
    ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)
    : 0;
  const avgBudgetStr = avgBudget >= 1_000_000
    ? `${(avgBudget / 1_000_000).toFixed(1)} M`
    : avgBudget > 0 ? `${Math.round(avgBudget / 1000)} tis.`
    : "—";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <StatCard label="Celkem leadů" value={loading ? "…" : leads.length} />
          <StatCard label="Tento měsíc" value={loading ? "…" : thisMonth} />
          <StatCard label="Aktivních" value={loading ? "…" : aktivni} />
          <StatCard label="Průměrný budget" value={loading ? "…" : avgBudgetStr} />
        </div>
      </div>

      <div className="px-4 md:px-6 pb-3 flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat..."
          className="flex-1 text-sm px-3 py-2 rounded-lg focus:outline-none transition-all"
          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--yellow)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs px-3 py-2 rounded-lg flex-shrink-0"
            style={{ color: "var(--muted)", background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            Zrušit
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ borderTop: "1px solid var(--border)" }}>
        <DataTable
          columns={COLUMNS}
          rows={leads as unknown as Record<string, string | undefined>[]}
          loading={loading}
          searchQuery={search}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
