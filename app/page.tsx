"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MessageList, Message } from "@/app/components/chat/MessageList";
import { ChatInput } from "@/app/components/chat/ChatInput";

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      sessionStorage.setItem("auth", "1");
      onLogin();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-sm px-8 py-10 rounded-3xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "var(--yellow)" }}
          >
            <span className="font-display text-black font-extrabold text-2xl">P</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl" style={{ color: "var(--text)" }}>
            Pepa Agent
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Back Office Assistant
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Zadej heslo..."
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--yellow)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          {error && (
            <p className="text-sm text-center" style={{ color: "var(--error)" }}>
              Špatné heslo, zkus to znovu.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-xl text-sm font-display font-bold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--yellow)", color: "#000" }}
          >
            {loading ? "Ověřuji..." : "Přihlásit se"}
          </button>
        </form>
      </div>
    </div>
  );
}

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
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("auth") === "1") {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

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
          content: "Omlouvám se, nastala chyba při zpracování dotazu. Zkus to prosím znovu.",
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

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col flex-shrink-0"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--yellow)" }}
            >
              <span className="font-display font-extrabold text-base text-black">P</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-sm leading-tight" style={{ color: "var(--text)" }}>
                Pepa Agent
              </h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Back Office Assistant</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
              style={
                item.active
                  ? { background: "var(--yellow)", color: "#000", fontFamily: "var(--font-display)", fontWeight: 700 }
                  : { color: "var(--muted)" }
              }
              onMouseEnter={(e) => {
                if (!item.active) e.currentTarget.style.background = "var(--surface-elevated)";
              }}
              onMouseLeave={(e) => {
                if (!item.active) e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Status */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-xs" style={{ color: "var(--muted)" }}>Agent aktivní</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--border)" }}>claude-sonnet-4-6</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="font-display font-bold text-base" style={{ color: "var(--text)" }}>
              Chat s agentem
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Ptej se na klienty, nemovitosti, leady nebo požádej o report
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDark((d) => !d)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
              style={{ background: dark ? "var(--yellow)" : "var(--surface-elevated)", border: "1px solid var(--border)" }}
              title={dark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{ transform: dark ? "translateX(1.375rem)" : "translateX(0.25rem)" }}
              />
            </button>
            <button
              onClick={() => setMessages([])}
              className="text-xs transition-colors hover:opacity-100 opacity-60"
              style={{ color: "var(--muted)" }}
            >
              Vyčistit chat
            </button>
          </div>
        </header>

        {/* Messages + Input */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
          <MessageList messages={messages} dark={dark} />
          <ChatInput onSend={sendMessage} disabled={loading} dark={dark} />
        </div>
      </main>
    </div>
  );
}
