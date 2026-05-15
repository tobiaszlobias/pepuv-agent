"use client";

import React from "react";

interface Column {
  key: string;
  label: string;
  render?: (value: string | undefined, row: Record<string, string | undefined>) => React.ReactNode;
  mobileHide?: boolean;
  mobilePrimary?: boolean;
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, string | undefined>[];
  loading: boolean;
  searchQuery?: string;
  isMobile?: boolean;
  rowStyle?: (row: Record<string, string | undefined>) => React.CSSProperties;
}

export function DataTable({ columns, rows, loading, searchQuery, isMobile, rowStyle }: DataTableProps) {
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

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const filtered = searchQuery
    ? rows.filter((row) =>
        columns.some((col) =>
          normalize(row[col.key] ?? "").includes(normalize(searchQuery))
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

  // Mobile: card list
  if (isMobile) {
    const primaryCol = columns[0];
    const restCols = columns.slice(1);
    return (
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {filtered.map((row, i) => (
          <div key={i} className="px-4 py-3 flex flex-col gap-1.5" style={rowStyle?.(row)}>
            <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {primaryCol.render
                ? primaryCol.render(row[primaryCol.key], row)
                : row[primaryCol.key] || <span style={{ color: "var(--muted)" }}>—</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {restCols.map((col) => (
                <div key={col.key} className="flex items-center gap-1.5 text-xs">
                  <span style={{ color: "var(--muted)" }}>{col.label}:</span>
                  <span style={{ color: "var(--text)" }}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key] || <span style={{ color: "var(--muted)" }}>—</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop: table
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          {columns.map((col) => (
            <th
              key={col.key}
              className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide"
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
            style={{ borderBottom: "1px solid var(--border)", ...rowStyle?.(row) }}
            className="transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-elevated)")}
            onMouseLeave={(e) => { const base = rowStyle?.(row)?.background as string | undefined; e.currentTarget.style.background = base ?? "transparent"; }}
          >
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-3" style={{ color: "var(--text)" }}>
                {col.render
                  ? col.render(row[col.key], row)
                  : row[col.key] || <span style={{ color: "var(--muted)" }}>—</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
