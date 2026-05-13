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

function formatDate(raw: string | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  aktivní:  { bg: "rgba(255,214,0,0.15)",  color: "#FFD600" },
  nový:     { bg: "rgba(96,165,250,0.12)", color: "#60a5fa" },
  neaktivní:{ bg: "rgba(136,136,128,0.15)", color: "#888880" },
  uzavřen:  { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
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

const COLUMNS_DESKTOP = [
  { key: "jmeno",        label: "Jméno" },
  { key: "email",        label: "Email",   render: (v: string | undefined) => <span style={{ color: "var(--muted)" }}>{v || "—"}</span> },
  { key: "telefon",      label: "Telefon", render: (v: string | undefined) => <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{v || "—"}</span> },
  { key: "zdroj",        label: "Zdroj" },
  { key: "status",       label: "Status",  render: (v: string | undefined) => <StatusBadge status={v} /> },
  { key: "makler",       label: "Makléř" },
  { key: "datum_pridani", label: "Přidán", render: (v: string | undefined) => <span style={{ color: "var(--muted)" }}>{formatDate(v)}</span> },
];

const COLUMNS_MOBILE = [
  { key: "jmeno",  label: "Jméno" },
  { key: "zdroj",  label: "Zdroj" },
  { key: "status", label: "Status", render: (v: string | undefined) => <StatusBadge status={v} /> },
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

export function ClientsView() {
  const cached = getCached<Client[]>("clients");
  const [clients, setClients] = useState<Client[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (cached !== null) return;
    fetch("/api/sheets/clients")
      .then((r) => r.json())
      .then((data: Client[]) => { setCached("clients", data); setClients(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const newThisMonth = clients.filter((c) => {
    if (!c.datum_pridani) return false;
    const d = new Date(c.datum_pridani);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const aktivni = clients.filter((c) => c.status.toLowerCase().includes("aktivní")).length;
  const sources = new Set(clients.map((c) => c.zdroj).filter(Boolean)).size;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <StatCard label="Celkem klientů" value={loading ? "…" : clients.length} />
          <StatCard label="Nových tento měsíc" value={loading ? "…" : newThisMonth} />
          <StatCard label="Aktivních" value={loading ? "…" : aktivni} />
          <StatCard label="Zdrojů akvizice" value={loading ? "…" : sources} />
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
          columns={isMobile ? COLUMNS_MOBILE : COLUMNS_DESKTOP}
          rows={clients as unknown as Record<string, string | undefined>[]}
          loading={loading}
          searchQuery={search}
        />
      </div>
    </div>
  );
}
