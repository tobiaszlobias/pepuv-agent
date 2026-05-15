"use client";

import { useState } from "react";

interface CuzkDetail {
  typStavby: string;
  zpusobVyuziti: string;
  zpusobyOchrany: string[];
  pocetJednotek: number;
  castObce: string;
  lv: { cislo: number; katastralniUzemi: string } | null;
  maRizeni: boolean;
}

interface Listing {
  address: string;
  price: number;
  price_per_m2?: number;
  area_m2?: number;
  type: string;
  url: string;
  cuzk_status?: "ok" | "warning" | "problem" | "unknown";
  cuzk_warnings?: string[];
  cuzk_detail?: CuzkDetail | null;
}

interface ListingsData {
  locality: string;
  summary: { total: number; ok: number; warning: number; problem: number; unknown: number };
  listings: Listing[];
}

function StatusBadge({ status }: { status: Listing["cuzk_status"] }) {
  if (status === "ok") return <span title="Čisté">✅</span>;
  if (status === "warning") return <span title="Upozornění">⚠️</span>;
  if (status === "problem") return <span title="Problém">❌</span>;
  return <span title="Neověřeno" className="opacity-30">—</span>;
}

function formatPrice(p: number) {
  if (!p) return "—";
  return (p / 1_000_000).toFixed(1).replace(".", ",") + " M Kč";
}

function formatPriceM2(p?: number) {
  if (!p) return "—";
  return p.toLocaleString("cs-CZ") + " Kč/m²";
}

export function ListingsTable({ data }: { data: ListingsData }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { summary, listings, locality } = data;

  const summaryParts: string[] = [];
  if (summary.ok > 0) summaryParts.push(`${summary.ok} čistých`);
  if (summary.warning > 0) summaryParts.push(`${summary.warning} s upozorněním`);
  if (summary.problem > 0) summaryParts.push(`${summary.problem} problém`);
  if (summary.unknown > 0) summaryParts.push(`${summary.unknown} neověřeno`);

  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
          Nabídky{locality ? ` — ${locality}` : ""}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Z {summary.total} nemovitostí: {summaryParts.join(", ")}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>Adresa</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>Typ</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>Plocha</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>Cena</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>Kč/m²</th>
              <th className="text-center px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>Katastr</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l, i) => (
              <>
                <tr
                  key={i}
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: expanded === i ? "rgba(255,214,0,0.05)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (expanded !== i) e.currentTarget.style.background = "var(--surface-elevated)"; }}
                  onMouseLeave={(e) => { if (expanded !== i) e.currentTarget.style.background = "transparent"; }}
                >
                  <td className="px-3 py-2.5">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                      style={{ color: "var(--yellow)" }}
                    >
                      {l.address || "—"}
                    </a>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{l.type}</td>
                  <td className="px-3 py-2.5 text-right" style={{ color: "var(--text)" }}>
                    {l.area_m2 ? `${l.area_m2} m²` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium" style={{ color: "var(--text)" }}>
                    {formatPrice(l.price)}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: "var(--muted)" }}>
                    {formatPriceM2(l.price_per_m2)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <StatusBadge status={l.cuzk_status} />
                      {l.cuzk_warnings && l.cuzk_warnings.length > 0 && (
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          {l.cuzk_warnings[0]}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expanded === i && l.cuzk_detail && (
                  <tr key={`${i}-detail`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td colSpan={6} className="px-4 py-3" style={{ background: "rgba(255,214,0,0.04)" }}>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                        <div>
                          <span style={{ color: "var(--muted)" }}>Typ stavby: </span>
                          <span style={{ color: "var(--text)" }}>{l.cuzk_detail.zpusobVyuziti || l.cuzk_detail.typStavby || "—"}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted)" }}>Počet jednotek: </span>
                          <span style={{ color: "var(--text)" }}>{l.cuzk_detail.pocetJednotek}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted)" }}>Část obce: </span>
                          <span style={{ color: "var(--text)" }}>{l.cuzk_detail.castObce || "—"}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted)" }}>Památková ochrana: </span>
                          <span style={{ color: "var(--text)" }}>
                            {l.cuzk_detail.zpusobyOchrany.length > 0 ? l.cuzk_detail.zpusobyOchrany.join(", ") : "bez ochrany"}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted)" }}>Právní řízení: </span>
                          <span style={{ color: l.cuzk_detail.maRizeni ? "#f87171" : "#4ade80" }}>
                            {l.cuzk_detail.maRizeni ? "⚠️ Aktivní řízení" : "✓ Čisté"}
                          </span>
                        </div>
                        {l.cuzk_detail.lv && (
                          <div>
                            <span style={{ color: "var(--muted)" }}>List vlastnictví: </span>
                            <span style={{ color: "var(--text)" }}>LV {l.cuzk_detail.lv.cislo}, k.ú. {l.cuzk_detail.lv.katastralniUzemi}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {/* Expanded — no ČÚZK data */}
                {expanded === i && !l.cuzk_detail && l.cuzk_status === "unknown" && (
                  <tr key={`${i}-nodata`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td colSpan={6} className="px-4 py-2 text-xs" style={{ color: "var(--muted)", background: "var(--surface-elevated)" }}>
                      Katastrální data nejsou k dispozici (číslo popisné nebylo nalezeno).
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
