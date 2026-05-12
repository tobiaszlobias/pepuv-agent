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

  useEffect(() => {
    if (cached !== null) return;
    fetch("/api/sheets/leads")
      .then((r) => r.json())
      .then((data: Lead[]) => { setCached("leads", data); setLeads(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="font-display font-bold text-base" style={{ color: "var(--text)" }}>Leady</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          {loading ? "Načítám..." : `${leads.length} leadů`}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <DataTable columns={COLUMNS} rows={leads as unknown as Record<string, string | undefined>[]} loading={loading} />
      </div>
    </div>
  );
}
