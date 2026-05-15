"use client";

import React from "react";

interface Column {
  key: string;
  label: string;
  render?: (value: string | undefined, row: Record<string, string | undefined>) => React.ReactNode;
}

// Mobile card layout config — defines which fields go where
export interface MobileConfig {
  primary: string;        // large title (jméno, adresa)
  badge?: string;         // status badge, top-right
  row1?: string[];        // secondary info — shown as pills/chips row
  row2?: string[];        // tertiary info — small muted text
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, string | undefined>[];
  loading: boolean;
  searchQuery?: string;
  isMobile?: boolean;
  rowStyle?: (row: Record<string, string | undefined>) => React.CSSProperties;
  mobileConfig?: MobileConfig;
}

export function DataTable({ columns, rows, loading, searchQuery, isMobile, rowStyle, mobileConfig }: DataTableProps) {
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

  const colMap = Object.fromEntries(columns.map((c) => [c.key, c]));

  function renderCell(key: string, row: Record<string, string | undefined>) {
    const col = colMap[key];
    if (!col) return null;
    return col.render ? col.render(row[key], row) : (row[key] || <span style={{ color: "var(--muted)" }}>—</span>);
  }

  // Mobile: structured card layout
  if (isMobile && mobileConfig) {
    return (
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {filtered.map((row, i) => (
          <div
            key={i}
            className="px-4 py-3.5 flex flex-col gap-2"
            style={{ ...rowStyle?.(row) }}
          >
            {/* Top row: primary + badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold leading-snug flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>
                {renderCell(mobileConfig.primary, row)}
              </div>
              {mobileConfig.badge && (
                <div className="flex-shrink-0">
                  {renderCell(mobileConfig.badge, row)}
                </div>
              )}
            </div>

            {/* Row 1: key info as label–value pairs */}
            {mobileConfig.row1 && mobileConfig.row1.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {mobileConfig.row1.map((key) => {
                  const col = colMap[key];
                  if (!col) return null;
                  return (
                    <div key={key} className="flex items-center gap-1 text-xs">
                      <span style={{ color: "var(--muted)" }}>{col.label}:</span>
                      <span style={{ color: "var(--text)" }}>{renderCell(key, row)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Row 2: tertiary info, smaller */}
            {mobileConfig.row2 && mobileConfig.row2.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {mobileConfig.row2.map((key) => {
                  const col = colMap[key];
                  if (!col) return null;
                  const val = row[key];
                  if (!val) return null;
                  return (
                    <span key={key} className="text-xs" style={{ color: "var(--muted)" }}>
                      {col.label}: {col.render ? col.render(val, row) : val}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Mobile fallback (no mobileConfig): simple card dump
  if (isMobile) {
    const [primaryCol, ...restCols] = columns;
    return (
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {filtered.map((row, i) => (
          <div key={i} className="px-4 py-3 flex flex-col gap-1.5" style={rowStyle?.(row)}>
            <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {renderCell(primaryCol.key, row)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {restCols.map((col) => (
                <div key={col.key} className="flex items-center gap-1.5 text-xs">
                  <span style={{ color: "var(--muted)" }}>{col.label}:</span>
                  <span style={{ color: "var(--text)" }}>{renderCell(col.key, row)}</span>
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
                {renderCell(col.key, row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
