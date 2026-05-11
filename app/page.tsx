"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MessageList, Message } from "@/app/components/chat/MessageList";
import { ChatInput } from "@/app/components/chat/ChatInput";

const LOADING_TEXTS = [
  "Analyzuji dotaz...",
  "Volám nástroje...",
  "Načítám data...",
  "Zpracovávám výsledky...",
  "Připravuji odpověď...",
];

const NAV_ITEMS = [
  { icon: "💬", label: "Chat", active: true },
  { icon: "👥", label: "Klienti", active: false },
  { icon: "🏠", label: "Nemovitosti", active: false },
  { icon: "📊", label: "Leady", active: false },
  { icon: "📧", label: "Emaily", active: false },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      let idx = 0;
      loadingTimerRef.current = setInterval(() => {
        idx = (idx + 1) % LOADING_TEXTS.length;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "loading" ? { ...m, loadingText: LOADING_TEXTS[idx] } : m
          )
        );
      }, 2000);
    } else {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
    return () => {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    };
  }, [loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (loading) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      };

      const loadingMsg: Message = {
        id: "loading",
        role: "assistant",
        content: "",
        loading: true,
        loadingText: LOADING_TEXTS[0],
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setLoading(true);

      try {
        const history = [
          ...messages,
          { role: "user" as const, content: text },
        ].map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok) throw new Error("API error");

        const data = await res.json();

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text,
          charts: data.charts || [],
          slides: data.slides || [],
        };

        setMessages((prev) =>
          prev.filter((m) => m.id !== "loading").concat(assistantMsg)
        );
      } catch {
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Omlouvám se, nastala chyba při zpracování dotazu. Zkus to prosím znovu.",
        };
        setMessages((prev) =>
          prev.filter((m) => m.id !== "loading").concat(errMsg)
        );
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  return (
    <div className={`flex h-screen ${dark ? "bg-gray-950" : "bg-gray-100"}`}>
      {/* Sidebar */}
      <aside className={`w-64 flex flex-col ${dark ? "bg-gray-900" : "bg-gray-900"}`}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">
                Pepa Agent
              </h1>
              <p className="text-gray-400 text-xs">Back Office Assistant</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Status */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-gray-400 text-xs">Agent aktivní</span>
          </div>
          <p className="text-gray-600 text-xs mt-1">claude-sonnet-4-6</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`border-b px-6 py-4 flex items-center justify-between ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <div>
            <h2 className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Chat s agentem</h2>
            <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Ptej se na klienty, nemovitosti, leady nebo požádej o report
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dark ? "bg-indigo-600" : "bg-gray-300"}`}
              title={dark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dark ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <button
              onClick={() => setMessages([])}
              className={`text-xs transition-colors ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
            >
              Vyčistit chat
            </button>
          </div>
        </header>

        {/* Messages + Input */}
        <div className={`flex-1 flex flex-col overflow-hidden ${dark ? "bg-gray-950" : "bg-gray-50"}`}>
          <MessageList messages={messages} dark={dark} />
          <ChatInput onSend={sendMessage} disabled={loading} dark={dark} />
        </div>
      </main>
    </div>
  );
}
