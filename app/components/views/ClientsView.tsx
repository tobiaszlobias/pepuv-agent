"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/app/components/DataTable";
import { getCached, setCached } from "@/lib/cache";

interface Client {
  id: string;
  jmeno: string;
  email: string;
  telefon: string;
  zdroj: string;
  datum_pridani: string;
  status: string;
  makler: string;
}

const COLUMNS = [
  { key: "jmeno", label: "Jméno" },
  { key: "email", label: "Email" },
  { key: "telefon", label: "Telefon" },
  { key: "zdroj", label: "Zdroj" },
  { key: "status", label: "Status" },
  { key: "makler", label: "Makléř" },
  { key: "datum_pridani", label: "Přidán" },
];

export function ClientsView() {
  const cached = getCached<Client[]>("clients");
  const [clients, setClients] = useState<Client[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    if (cached !== null) return;
    fetch("/api/sheets/clients")
      .then((r) => r.json())
      .then((data: Client[]) => { setCached("clients", data); setClients(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="font-display font-bold text-base" style={{ color: "var(--text)" }}>Klienti</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          {loading ? "Načítám..." : `${clients.length} klientů`}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <DataTable columns={COLUMNS} rows={clients as unknown as Record<string, string | undefined>[]} loading={loading} />
      </div>
    </div>
  );
}
