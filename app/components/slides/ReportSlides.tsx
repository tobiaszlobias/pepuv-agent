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

export function ReportSlides({ slides }: { slides: Slide[] }) {
  return (
    <div className="my-3 space-y-3">
      {slides.map((slide, i) => (
        <div
          key={i}
          className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white overflow-hidden"
        >
          {/* Slide header */}
          <div className="bg-indigo-600 px-4 py-3 flex items-center gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <h3 className="text-white font-semibold text-sm">{slide.title}</h3>
              {slide.subtitle && (
                <p className="text-indigo-200 text-xs">{slide.subtitle}</p>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          {slide.metrics && (
            <div className="grid grid-cols-2 gap-3 p-4">
              {slide.metrics.map((metric, j) => (
                <div
                  key={j}
                  className="bg-white rounded-lg border border-indigo-100 p-3"
                >
                  <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-gray-900">
                      {metric.value}
                    </span>
                    {metric.change && (
                      <span
                        className={`text-xs font-medium ${
                          metric.change.startsWith("+")
                            ? "text-green-600"
                            : metric.change.startsWith("-")
                            ? "text-red-500"
                            : "text-gray-400"
                        }`}
                      >
                        {metric.change}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Highlights */}
          {slide.highlights && (
            <div className="px-4 pb-3">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Highlights
              </p>
              <ul className="space-y-1.5">
                {slide.highlights.map((h, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next steps */}
          {slide.next_steps && (
            <div className="px-4 pb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Příští kroky
              </p>
              <ul className="space-y-1.5">
                {slide.next_steps.map((s, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-indigo-500 mt-0.5">→</span>
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
