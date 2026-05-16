"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentChart } from "@/app/components/charts/AgentChart";
import { ReportSlides } from "@/app/components/slides/ReportSlides";
import { ListingsTable } from "@/app/components/listings/ListingsTable";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  data: Record<string, unknown>[];
  x_key?: string;
  y_key?: string;
}

interface SlideMetric {
  label: string;
  value: string | number;
  change: string;
}

interface Slide {
  title: string;
  subtitle?: string;
  metrics?: SlideMetric[];
  highlights?: string[];
  next_steps?: string[];
}

interface CuzkDetailData {
  typStavby: string;
  zpusobVyuziti: string;
  zpusobyOchrany: string[];
  pocetJednotek: number;
  castObce: string;
  lv: { cislo: number; katastralniUzemi: string } | null;
  maRizeni: boolean;
}

interface ListingItem {
  address: string;
  price: number;
  price_per_m2?: number;
  area_m2?: number;
  type: string;
  url: string;
  cuzk_status?: "ok" | "warning" | "problem" | "unknown";
  cuzk_warnings?: string[];
  cuzk_detail?: CuzkDetailData | null;
}

interface ListingsData {
  locality: string;
  summary: { total: number; ok: number; warning: number; problem: number; unknown: number };
  listings: ListingItem[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartData[];
  slides?: Slide[];
  listings?: ListingsData | null;
  loading?: boolean;
  loadingText?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text.trim()) return null;
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all opacity-60 hover:opacity-100"
      style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--muted)" }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Zkopírováno
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="4" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="var(--surface-elevated)"/></svg>
          Kopírovat
        </>
      )}
    </button>
  );
}

function TypingIndicator({ text }: { text?: string }) {
  return (
    <div className="flex gap-2 items-center px-1 py-1">
      <div className="flex gap-1 items-center">
        <span
          className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]"
          style={{ background: "var(--yellow)" }}
        />
        <span
          className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]"
          style={{ background: "var(--yellow)" }}
        />
        <span
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ background: "var(--yellow)" }}
        />
      </div>
      {text && (
        <span className="text-xs italic" style={{ color: "var(--muted)" }}>
          {text}
        </span>
      )}
    </div>
  );
}


const QUICK_PROMPTS = [
  { label: "Noví klienti Q1", prompt: "Jaké nové klienty máme za 1. kvartál? Odkud přišli? Můžeš to znázornit graficky?" },
  { label: "Vývoj leadů a prodejů", prompt: "Vytvoř graf vývoje počtu leadů a prodaných nemovitostí za posledních 6 měsíců." },
  { label: "Email zájemci", prompt: "Napiš e-mail pro Jana Nováka, který má zájem o byt na Náměstí Míru 5, Praha. Doporuč mu termín prohlídky na základě mé aktuální dostupnosti v kalendáři." },
  { label: "Chybějící rekonstrukce", prompt: "Najdi nemovitosti, u kterých nám v systému chybí data o rekonstrukci a stavebních úpravách a připrav jejich seznam k doplnění." },
  { label: "Týdenní report", prompt: "Shrň výsledky tohoto pracovního týdne (týden 20, 11.–16. května 2026) do krátkého reportu pro vedení a připrav k tomu prezentaci se třemi slidy." },
  { label: "Sreality Holešovice", prompt: "Ukáž mi aktuální nabídky bytů na Sreality v lokalitě Praha Holešovice a ověř jejich katastr." },
  { label: "Kdy mám volno?", prompt: "Kdy mám volno tento týden? Ukaž mi volné termíny z mého kalendáře." },
];

export function MessageList({ messages, dark, onSend }: { messages: Message[]; dark: boolean; onSend?: (text: string) => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-6 gap-5">
        {/* Welcome heading */}
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Jak ti dnes mohu pomoci?</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Vyber dotaz nebo napiš vlastní</p>
        </div>
        {/* Prompt grid */}
        <div className="w-full max-w-md grid grid-cols-2 gap-2">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.label}
              onClick={() => onSend?.(item.prompt)}
              className="text-left px-3 py-3 rounded-xl text-xs transition-all flex flex-col gap-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--yellow)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <span className="font-semibold" style={{ color: "var(--yellow)" }}>{item.label}</span>
              <span className="line-clamp-2" style={{ color: "var(--muted)", lineHeight: 1.4 }}>{item.prompt}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
          {/* Bubble row */}
          <div className={`flex w-full min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div
                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mr-2 mt-1 font-display font-extrabold text-sm text-black"
                style={{ background: "var(--yellow)" }}
              >
                P
              </div>
            )}

            <div
              className={`min-w-0 w-full max-w-[88%] px-3 py-3 text-sm ${
                msg.role === "user"
                  ? "rounded-2xl rounded-tr-sm"
                  : "rounded-2xl rounded-tl-sm"
              }`}
              style={
                msg.role === "user"
                  ? { background: "var(--yellow)", color: "#000" }
                  : {
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }
              }
            >
              {msg.loading ? (
                <TypingIndicator text={msg.loadingText} />
              ) : (
                <>
                  <div
                    className={
                      msg.role === "user"
                        ? "text-sm font-medium"
                        : dark
                        ? "prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-headings:my-1 prose-li:my-0 prose-table:text-xs [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full"
                        : "prose prose-sm max-w-none prose-p:my-0.5 prose-headings:my-1 prose-li:my-0 prose-table:text-xs [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full"
                    }
                  >
                    {msg.role === "user" ? (
                      <p>{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--yellow)" }}>
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                </>
              )}
            </div>

            {msg.role === "user" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/prasepepa.png"
                alt="Ty"
                className="flex-shrink-0 w-8 h-8 rounded-xl object-cover ml-2 mt-1"
              />
            )}
          </div>

          {/* Charts — full width below bubble so they use the entire screen width */}
          {!msg.loading && msg.charts && msg.charts.length > 0 && msg.role === "assistant" && (
            <div className="w-full mt-2 space-y-3">
              {msg.charts.map((chart, i) => (
                <ErrorBoundary
                  key={i}
                  fallback={
                    <div className="text-xs py-2" style={{ color: "var(--error)" }}>
                      Graf se nepodařilo zobrazit.
                    </div>
                  }
                >
                  <AgentChart chart={chart} index={i} />
                </ErrorBoundary>
              ))}
            </div>
          )}

          {/* Slides — full width below bubble */}
          {!msg.loading && msg.slides && msg.slides.length > 0 && msg.role === "assistant" && (
            <div className="w-full mt-2">
              <ErrorBoundary
                fallback={
                  <div className="text-xs py-2" style={{ color: "var(--error)" }}>
                    Report se nepodařilo zobrazit.
                  </div>
                }
              >
                <ReportSlides slides={msg.slides} />
              </ErrorBoundary>
            </div>
          )}

          {/* Listings table — full width below bubble */}
          {!msg.loading && msg.listings && msg.role === "assistant" && (
            <div className="w-full">
              <ErrorBoundary
                fallback={
                  <div className="text-xs py-2" style={{ color: "var(--error)" }}>
                    Tabulku nabídek se nepodařilo zobrazit.
                  </div>
                }
              >
                <ListingsTable data={msg.listings} />
              </ErrorBoundary>
            </div>
          )}

          {/* Copy button — always below the full message, aligned to bubble edge */}
          {!msg.loading && msg.content && (
            <div className={msg.role === "user" ? "mr-2 sm:mr-10" : "ml-2 sm:ml-10"}>
              <CopyButton text={msg.content} />
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
