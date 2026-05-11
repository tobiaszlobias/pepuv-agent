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
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
      </div>
      {text && (
        <span className="text-xs text-gray-400 italic">{text}</span>
      )}
    </div>
  );
}

export function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
          <span className="text-3xl">🏢</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Pepa Agent
        </h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Tvůj back office asistent pro realitní firmu. Zeptej se na data
          klientů, nemovitostí, leadů nebo požádej o report.
        </p>
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
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 mt-1">
              <span className="text-sm">🤖</span>
            </div>
          )}

          <div
            className={`max-w-[85%] ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3"
                : "bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
            }`}
          >
            {msg.loading ? (
              <TypingIndicator text={msg.loadingText} />
            ) : (
              <>
                <div className={`text-sm ${msg.role === "user" ? "text-white" : "prose prose-sm max-w-none prose-p:my-0.5 prose-headings:my-1 prose-li:my-0 prose-table:text-xs"}`}>
                  {msg.role === "user" ? (
                    <p>{msg.content}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Grafy */}
                {msg.charts && msg.charts.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {msg.charts.map((chart, i) => (
                      <ErrorBoundary key={i} fallback={<div className="text-xs text-red-400 py-2">Graf se nepodařilo zobrazit.</div>}>
                        <AgentChart chart={chart} />
                      </ErrorBoundary>
                    ))}
                  </div>
                )}

                {/* Report slidy */}
                {msg.slides && msg.slides.length > 0 && (
                  <ErrorBoundary fallback={<div className="text-xs text-red-400 py-2">Report se nepodařilo zobrazit.</div>}>
                    <ReportSlides slides={msg.slides} />
                  </ErrorBoundary>
                )}
              </>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
