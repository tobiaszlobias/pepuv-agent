"use client";

interface Metric {
  label: string;
  value: string | number;
  change: string;
}

interface Slide {
  title: string;
  subtitle?: string;
  metrics?: Metric[];
  highlights?: string[];
  next_steps?: string[];
}

function ChangeTag({ change }: { change: string }) {
  if (!change) return null;
  const isPos = change.startsWith("+");
  const isNeg = change.startsWith("-");
  return (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
      style={{
        background: isPos ? "rgba(74,222,128,0.12)" : isNeg ? "rgba(248,113,113,0.12)" : "var(--border)",
        color: isPos ? "#4ade80" : isNeg ? "#f87171" : "var(--muted)",
      }}
    >
      {change}
    </span>
  );
}

function SlideNumber({ n }: { n: number }) {
  return (
    <span
      className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-black"
      style={{ background: "var(--yellow)" }}
    >
      {n}
    </span>
  );
}

export function ReportSlides({ slides }: { slides: Slide[] }) {
  return (
    <div className="my-3 space-y-3">
      {slides.map((slide, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <SlideNumber n={i + 1} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text)" }}>
                {slide.title}
              </p>
              {slide.subtitle && (
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {slide.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Metrics */}
          {slide.metrics && slide.metrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px p-px" style={{ background: "var(--border)" }}>
              {slide.metrics.map((metric, j) => (
                <div
                  key={j}
                  className="px-4 py-3"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <p className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
                    {metric.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold" style={{ color: "var(--text)" }}>
                      {metric.value}
                    </span>
                    <ChangeTag change={metric.change} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Highlights */}
          {slide.highlights && slide.highlights.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--muted)" }}>
                Highlights
              </p>
              <ul className="space-y-2">
                {slide.highlights.map((h, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text)" }}>
                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center" style={{ background: "rgba(74,222,128,0.12)" }}>
                      <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                        <path d="M2 6l3 3 5-5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next steps */}
          {slide.next_steps && slide.next_steps.length > 0 && (
            <div className="px-4 pb-4" style={{ paddingTop: slide.highlights ? "0" : "12px" }}>
              {slide.highlights && (
                <div className="h-px mb-3" style={{ background: "var(--border)" }} />
              )}
              <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--muted)" }}>
                Příští kroky
              </p>
              <ul className="space-y-2">
                {slide.next_steps.map((s, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text)" }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--yellow)" }}>→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
