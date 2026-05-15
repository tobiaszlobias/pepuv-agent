"use client";

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

function buildNote(l: Listing): string {
  if (l.cuzk_status === "unknown") return "Neověřeno — chybí č.p.";
  if (!l.cuzk_detail) return "—";

  const d = l.cuzk_detail;
  const parts: string[] = [];

  if (d.pocetJednotek > 0) parts.push(`${d.pocetJednotek} jednotek`);
  if (d.maRizeni) {
    parts.push("⚠ aktivní řízení");
  } else {
    parts.push("bez právních řízení");
  }
  if (d.zpusobyOchrany.length > 0) parts.push(d.zpusobyOchrany.join(", "));

  return parts.join(", ");
}

export function ListingsTable({ data }: { data: ListingsData }) {
  const { summary, listings, locality } = data;

  const summaryParts: string[] = [];
  if (summary.ok > 0) summaryParts.push(`${summary.ok} čistých`);
  if (summary.warning > 0) summaryParts.push(`${summary.warning} s upozorněním`);
  if (summary.problem > 0) summaryParts.push(`${summary.problem} problém`);
  if (summary.unknown > 0) summaryParts.push(`${summary.unknown} neověřeno`);

  return (
    <div className="mt-3 rounded-xl overflow-hidden w-full" style={{ border: "1px solid var(--border)" }}>
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
              <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td className="px-3 py-2.5">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
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
                  <StatusBadge status={l.cuzk_status} />
                </td>
                <td className="px-3 py-2.5" style={{ color: l.cuzk_detail?.maRizeni ? "#f87171" : "var(--muted)" }}>
                  {buildNote(l)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
