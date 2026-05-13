"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentChart } from "@/app/components/charts/AgentChart";
import { ReportSlides } from "@/app/components/slides/ReportSlides";
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

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartData[];
  slides?: Slide[];
  loading?: boolean;
  loadingText?: string;
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
  { label: "Noví klienti Q1", prompt: "Jací noví klienti za Q1 2025?" },
  { label: "Vývoj leadů", prompt: "Ukáž vývoj leadů za posledních 6 měsíců" },
  { label: "Email zájemci", prompt: "Napiš email zájemci o prohlídku" },
  { label: "Chybějící data", prompt: "Nemovitosti bez dat o rekonstrukci" },
  { label: "Týdenní report", prompt: "Shrň výsledky minulého týdne" },
  { label: "Sreality monitoring", prompt: "Nové nabídky Praha Holešovice" },
];

export function MessageList({ messages, dark, onSend }: { messages: Message[]; dark: boolean; onSend?: (text: string) => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Gemini_Generated_Image_p5o2v7p5o2v7p5o2.png"
            alt="Pepův agent"
            className="w-14 h-14 rounded-2xl object-cover"
          />
          <div>
            <h2 className="font-display font-bold text-2xl" style={{ color: "var(--text)" }}>
              Pepův Agent
            </h2>
            <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--muted)" }}>
              Back office asistent pro realitní firmu — data, reporty, emaily, monitoring trhu.
            </p>
          </div>
        </div>

        {/* Quick prompt grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-xl">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.prompt}
              onClick={() => onSend?.(item.prompt)}
              className="text-left px-4 py-3 rounded-xl text-sm transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--yellow)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <span className="font-medium block text-xs mb-0.5" style={{ color: "var(--yellow)" }}>{item.label}</span>
              <span className="text-xs leading-snug" style={{ color: "var(--muted)" }}>{item.prompt}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {msg.role === "assistant" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/Gemini_Generated_Image_p5o2v7p5o2v7p5o2.png"
              alt="Pepův agent"
              className="flex-shrink-0 w-8 h-8 rounded-xl object-cover mr-2 mt-1"
            />
          )}

          <div
            className={`max-w-[85%] px-4 py-3 text-sm ${
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
                      ? "prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-headings:my-1 prose-li:my-0 prose-table:text-xs"
                      : "prose prose-sm max-w-none prose-p:my-0.5 prose-headings:my-1 prose-li:my-0 prose-table:text-xs"
                  }
                >
                  {msg.role === "user" ? (
                    <p>{msg.content}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>

                {msg.charts && msg.charts.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {msg.charts.map((chart, i) => (
                      <ErrorBoundary
                        key={i}
                        fallback={
                          <div className="text-xs py-2" style={{ color: "var(--error)" }}>
                            Graf se nepodařilo zobrazit.
                          </div>
                        }
                      >
                        <AgentChart chart={chart} />
                      </ErrorBoundary>
                    ))}
                  </div>
                )}

                {msg.slides && msg.slides.length > 0 && (
                  <ErrorBoundary
                    fallback={
                      <div className="text-xs py-2" style={{ color: "var(--error)" }}>
                        Report se nepodařilo zobrazit.
                      </div>
                    }
                  >
                    <ReportSlides slides={msg.slides} dark={dark} />
                  </ErrorBoundary>
                )}
              </>
            )}
          </div>

          {msg.role === "user" && (
            <div
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ml-2 mt-1"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: "var(--muted)" }}>
                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
              </svg>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
