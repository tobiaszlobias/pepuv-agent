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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex-1">
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {loading ? "Načítám..." : `${leads.length} leadů`}
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat..."
          className="text-sm px-3 py-1.5 rounded-lg focus:outline-none transition-all"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            width: "200px",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--yellow)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
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
