"use client";

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, string | undefined>[];
  loading: boolean;
  searchQuery?: string;
}

export function DataTable({ columns, rows, loading, searchQuery }: DataTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ background: "var(--yellow)" }} />
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ background: "var(--yellow)" }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--yellow)" }} />
        </div>
      </div>
    );
  }

  const filtered = searchQuery
    ? rows.filter((row) =>
        columns.some((col) =>
          (row[col.key] ?? "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : rows;

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm" style={{ color: "var(--muted)" }}>
        {searchQuery ? `Žádné výsledky pro „${searchQuery}".` : "Žádná data."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: "1px solid var(--border)" }}
              className="transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3" style={{ color: "var(--text)" }}>
                  {row[col.key] || <span style={{ color: "var(--muted)" }}>—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
