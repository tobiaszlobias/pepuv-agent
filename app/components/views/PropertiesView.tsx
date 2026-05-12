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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex-1">
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {loading ? "Načítám..." : `${properties.length} nemovitostí`}
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
          rows={properties as unknown as Record<string, string | undefined>[]}
          loading={loading}
          searchQuery={search}
        />
      </div>
    </div>
  );
}
