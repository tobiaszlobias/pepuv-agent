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

const STATUS_META: Record<string, { bg: string; color: string; rowBg: string }> = {
  nový:         { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa", rowBg: "rgba(96,165,250,0.04)" },
  kontaktován:  { bg: "rgba(168,85,247,0.12)",  color: "#a855f7", rowBg: "rgba(168,85,247,0.03)" },
  prohlídka:    { bg: "rgba(255,214,0,0.15)",   color: "#FFD600", rowBg: "rgba(255,214,0,0.04)" },
  nabídka:      { bg: "rgba(251,146,60,0.15)",  color: "#fb923c", rowBg: "rgba(251,146,60,0.04)" },
  uzavřen:      { bg: "rgba(74,222,128,0.12)",  color: "#4ade80", rowBg: "rgba(74,222,128,0.04)" },
  ztracen:      { bg: "rgba(255,92,92,0.12)",   color: "#ff5c5c", rowBg: "rgba(255,92,92,0.03)" },
};

function matchStatus(status: string): string | null {
  const k = status.toLowerCase();
  return Object.keys(STATUS_META).find((key) => k.includes(key)) ?? null;
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span style={{ color: "var(--muted)" }}>—</span>;
  const key = matchStatus(status);
  const s = key ? STATUS_META[key] : { bg: "var(--surface-elevated)", color: "var(--muted)" };
  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

const STATUS_FILTERS = ["vše", "nový", "kontaktován", "prohlídka", "nabídka", "uzavřen", "ztracen"];
const ZDROJ_FILTERS  = ["vše", "web", "sreality", "inzerce", "doporučení"];

const COLUMNS = [
  { key: "datum",           label: "Datum",   render: (v: string | undefined) => <span style={{ color: "var(--muted)" }}>{formatDate(v)}</span> },
  { key: "zdroj",           label: "Zdroj" },
  { key: "typ_nemovitosti", label: "Typ" },
  { key: "budget",          label: "Budget",  render: (v: string | undefined) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatPrice(v)}</span> },
  { key: "status",          label: "Status",  render: (v: string | undefined) => <StatusBadge status={v} /> },
  { key: "makler",          label: "Makléř" },
];

function rowStyle(row: Record<string, string | undefined>): React.CSSProperties {
  const key = matchStatus(row.status ?? "");
  return key ? { background: STATUS_META[key].rowBg } : {};
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

function FilterPills({ options, active, onChange }: { options: string[]; active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="text-xs px-2.5 py-1 rounded-lg transition-all capitalize"
          style={{
            background: active === opt ? "var(--yellow)" : "var(--surface-elevated)",
            color: active === opt ? "#000" : "var(--muted)",
            border: `1px solid ${active === opt ? "var(--yellow)" : "var(--border)"}`,
            fontWeight: active === opt ? 600 : 400,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("vše");
  const [zdrojFilter, setZdrojFilter] = useState("vše");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch("/api/sheets/leads")
      .then((r) => r.json())
      .then((data: Lead[]) => { setCached("leads", data); setLeads(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = leads.filter((l) => {
    if (statusFilter !== "vše" && !l.status.toLowerCase().includes(statusFilter)) return false;
    if (zdrojFilter !== "vše" && l.zdroj.toLowerCase() !== zdrojFilter) return false;
    return true;
  });

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
  const avgBudget = budgets.length > 0 ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0;
  const avgBudgetStr = avgBudget >= 1_000_000
    ? `${(avgBudget / 1_000_000).toFixed(1)} M`
    : avgBudget > 0 ? `${Math.round(avgBudget / 1000)} tis.` : "—";

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

      <div className="px-4 md:px-6 pb-3 flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
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
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Status:</span>
            <FilterPills options={STATUS_FILTERS} active={statusFilter} onChange={setStatusFilter} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Zdroj:</span>
            <FilterPills options={ZDROJ_FILTERS} active={zdrojFilter} onChange={setZdrojFilter} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ borderTop: "1px solid var(--border)" }}>
        <DataTable
          columns={COLUMNS}
          rows={filtered as unknown as Record<string, string | undefined>[]}
          loading={loading}
          searchQuery={search}
          isMobile={isMobile}
          rowStyle={rowStyle}
        />
      </div>
    </div>
  );
}
