"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/app/components/DataTable";

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sheets/properties")
      .then((r) => r.json())
      .then((data) => { setProperties(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h2 className="font-display font-bold text-base" style={{ color: "var(--text)" }}>Nemovitosti</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading ? "Načítám..." : `${properties.length} nemovitostí`}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <DataTable columns={COLUMNS} rows={properties as unknown as Record<string, string | undefined>[]} loading={loading} />
      </div>
    </div>
  );
}
