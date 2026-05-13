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

const COLUMNS = [
  { key: "datum", label: "Datum" },
  { key: "zdroj", label: "Zdroj" },
  { key: "typ_nemovitosti", label: "Typ nemovitosti" },
  { key: "budget", label: "Budget" },
  { key: "status", label: "Status" },
  { key: "makler", label: "Makléř" },
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
  const cached = getCached<Lead[]>("leads");
  const [leads, setLeads] = useState<Lead[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (cached !== null) return;
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

  const aktivni = leads.filter((l) =>
    l.status.toLowerCase().includes("aktivní") || l.status.toLowerCase().includes("nový")
  ).length;

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
      {/* Stats */}
      <div className="px-6 pt-5 pb-4 flex-shrink-0">
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Celkem leadů" value={loading ? "…" : leads.length} />
          <StatCard label="Tento měsíc" value={loading ? "…" : thisMonth} />
          <StatCard label="Aktivních" value={loading ? "…" : aktivni} />
          <StatCard label="Průměrný budget" value={loading ? "…" : avgBudgetStr} />
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 pb-3 flex items-center gap-3 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat podle zdroje, statusu, makléře..."
          className="flex-1 text-sm px-3 py-2 rounded-lg focus:outline-none transition-all"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--yellow)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ color: "var(--muted)", background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            Zrušit
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto" style={{ borderTop: "1px solid var(--border)" }}>
        <DataTable
          columns={COLUMNS}
          rows={leads as unknown as Record<string, string | undefined>[]}
          loading={loading}
          searchQuery={search}
        />
      </div>
    </div>
  );
}
