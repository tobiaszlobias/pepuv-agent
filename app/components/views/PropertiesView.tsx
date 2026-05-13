"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/app/components/DataTable";
import { getCached, setCached } from "@/lib/cache";

interface Property {
  id: string;
  adresa: string;
  mesto: string;
  ctvrt: string;
  typ: string;
  cena: string;
  stav: string;
  rok_rekonstrukce: string;
  makler: string;
  datum_pridani: string;
}

const COLUMNS = [
  { key: "adresa", label: "Adresa" },
  { key: "mesto", label: "Město" },
  { key: "ctvrt", label: "Čtvrť" },
  { key: "typ", label: "Typ" },
  { key: "cena", label: "Cena" },
  { key: "stav", label: "Stav" },
  { key: "rok_rekonstrukce", label: "Rekonstrukce" },
  { key: "makler", label: "Makléř" },
];

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color: warn ? "#FFD600" : "var(--text)" }}>{value}</p>
    </div>
  );
}

export function PropertiesView() {
  const cached = getCached<Property[]>("properties");
  const [properties, setProperties] = useState<Property[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (cached !== null) return;
    fetch("/api/sheets/properties")
      .then((r) => r.json())
      .then((data: Property[]) => { setCached("properties", data); setProperties(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const prices = properties
    .map((p) => parseInt(p.cena.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n) && n > 0);
  const avgPrice = prices.length > 0
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0;
  const avgPriceStr = avgPrice >= 1_000_000
    ? `${(avgPrice / 1_000_000).toFixed(1)} M`
    : avgPrice > 0 ? `${Math.round(avgPrice / 1000)} tis.`
    : "—";

  const missingRek = properties.filter((p) => !p.rok_rekonstrukce || p.rok_rekonstrukce === "").length;

  const typy = new Set(properties.map((p) => p.typ).filter(Boolean)).size;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats */}
      <div className="px-6 pt-5 pb-4 flex-shrink-0">
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Celkem nemovitostí" value={loading ? "…" : properties.length} />
          <StatCard label="Průměrná cena" value={loading ? "…" : avgPriceStr} />
          <StatCard label="Chybí rok rekonstrukce" value={loading ? "…" : missingRek} warn={missingRek > 0} />
          <StatCard label="Typy nemovitostí" value={loading ? "…" : typy} />
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 pb-3 flex items-center gap-3 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat podle adresy, čtvrti, makléře..."
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
          rows={properties as unknown as Record<string, string | undefined>[]}
          loading={loading}
          searchQuery={search}
        />
      </div>
    </div>
  );
}
