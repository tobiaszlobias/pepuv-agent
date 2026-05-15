"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MessageList, Message } from "@/app/components/chat/MessageList";
import { ChatInput } from "@/app/components/chat/ChatInput";
import { ClientsView } from "@/app/components/views/ClientsView";
import { PropertiesView } from "@/app/components/views/PropertiesView";
import { LeadsView } from "@/app/components/views/LeadsView";
import { DashboardView } from "@/app/components/views/DashboardView";
import { getCached, setCached } from "@/lib/cache";

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
            Pepův Agent
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
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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

type Page = "dashboard" | "chat" | "klienti" | "nemovitosti" | "leady";

function IconChat({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h2v3l3-3h7c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z"
        stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" fill="none"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" fill="none"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" fill="none"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" fill="none"/>
    </svg>
  );
}
function IconPeople({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" fill="none"/>
      <path d="M1 13.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" strokeLinecap="round" fill="none"/>
      <path d="M11 7.5c1.38 0 2.5 1.12 2.5 2.5v2.5" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" strokeLinecap="round" fill="none"/>
      <path d="M10.5 4a2 2 0 0 1 0 3" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IconBuilding({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" fill="none"/>
      <path d="M5 14V10h6v4" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M5 7h1.5M9.5 7H11M5 3V1.5h6V3" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IconChart({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 12l4-4 3 3 4-5 3 2" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M1 14.5h14" stroke={active ? "#000" : "currentColor"} strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

const NAV_ITEMS: { icon: (active: boolean) => React.ReactNode; label: string; page: Page }[] = [
  { icon: (a) => <IconChat active={a} />, label: "Chat", page: "chat" },
  { icon: (a) => <IconDashboard active={a} />, label: "Dashboard", page: "dashboard" },
  { icon: (a) => <IconPeople active={a} />, label: "Klienti", page: "klienti" },
  { icon: (a) => <IconBuilding active={a} />, label: "Nemovitosti", page: "nemovitosti" },
  { icon: (a) => <IconChart active={a} />, label: "Leady", page: "leady" },
];

type ModelId = "claude-haiku-4-5-20251001" | "claude-sonnet-4-6" | "claude-opus-4-7";

const MODELS: { id: ModelId; label: string; sub: string }[] = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku",  sub: "Rychlý" },
  { id: "claude-sonnet-4-6",         label: "Sonnet", sub: "Vyvážený" },
  { id: "claude-opus-4-7",           label: "Opus",   sub: "Nejlepší" },
];

function ModelDropdown({ model, setModel }: { model: ModelId; setModel: (m: ModelId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODELS.find((m) => m.id === model)!;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
        style={{
          background: "var(--surface-elevated)",
          border: `1px solid ${open ? "var(--yellow)" : "var(--border)"}`,
          color: "var(--text)",
        }}
      >
        <span className="font-semibold">{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "var(--muted)" }}>
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 rounded-xl overflow-hidden z-50 w-36"
          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
        >
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setModel(m.id); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors"
              style={{
                background: model === m.id ? "rgba(255,214,0,0.1)" : "transparent",
                borderBottom: "1px solid var(--border)",
                color: model === m.id ? "var(--yellow)" : "var(--text)",
              }}
              onMouseEnter={(e) => { if (model !== m.id) e.currentTarget.style.background = "var(--surface)"; }}
              onMouseLeave={(e) => { if (model !== m.id) e.currentTarget.style.background = "transparent"; }}
            >
              <span className="font-semibold">{m.label}</span>
              <span style={{ color: "var(--muted)" }}>{m.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<Page>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [model, setModel] = useState<ModelId>("claude-haiku-4-5-20251001");
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("auth") === "1") setAuthenticated(true);
    const savedPage = sessionStorage.getItem("activePage") as Page | null;
    if (savedPage) setActivePage(savedPage);
    const savedDark = sessionStorage.getItem("dark");
    if (savedDark !== null) setDark(savedDark === "1");
    const savedMessages = getCached<Message[]>("messages");
    if (savedMessages) setMessages(savedMessages);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

  useEffect(() => {
    if (messages.length === 0) return;
    const toSave = messages.filter((m) => !m.loading).slice(-30);
    setCached("messages", toSave);
  }, [messages]);

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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000);

      try {
        const history = [
          ...messages,
          { role: "user" as const, content: text },
        ].map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, model }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("API error");

        const data = await res.json();

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text,
          charts: data.charts || [],
          slides: data.slides || [],
          listings: data.listings || null,
        };

        setMessages((prev) =>
          prev.filter((m) => m.id !== "loading").concat(assistantMsg)
        );
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err instanceof Error && err.name === "AbortError";
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: isTimeout
            ? "Dotaz trval příliš dlouho (90 s). Zkus jednodušší dotaz nebo přepni na rychlejší model (Haiku)."
            : "Omlouvám se, nastala chyba při zpracování dotazu. Zkus to prosím znovu.",
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
    <div className="flex h-[100dvh]" style={{ background: "var(--bg)" }}>
      {/* Sidebar — desktop only */}
      <aside
        className="hidden md:flex w-60 flex-col flex-shrink-0"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="px-5 flex items-center flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", height: "65px" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--yellow)" }}
            >
              <span className="font-display font-extrabold text-base text-black">P</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-sm leading-tight" style={{ color: "var(--text)" }}>
                Pepův Agent
              </h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Back Office Assistant</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.page;
            return (
              <button
                key={item.label}
                onClick={() => { setActivePage(item.page); sessionStorage.setItem("activePage", item.page); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
                style={
                  isActive
                    ? { background: "var(--yellow)", color: "#000", fontWeight: 600 }
                    : { color: "var(--muted)" }
                }
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--surface-elevated)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span className="flex-shrink-0">{item.icon(isActive)}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status dot */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
          <span className="text-xs" style={{ color: "var(--muted)" }}>Online</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="px-4 md:px-6 flex items-center justify-between flex-shrink-0"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", height: "65px" }}
        >
          <div className="flex items-center gap-3">
            {/* Logo — mobile only */}
            <div
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--yellow)" }}
            >
              <span className="font-display font-extrabold text-sm text-black">P</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm md:text-base" style={{ color: "var(--text)" }}>
                {activePage === "dashboard" && "Dashboard"}
                {activePage === "chat" && "Pepův Agent"}
                {activePage === "klienti" && "Klienti"}
                {activePage === "nemovitosti" && "Nemovitosti"}
                {activePage === "leady" && "Leady"}
              </h2>
              <p className="hidden md:block text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {activePage === "dashboard" && "Přehled klíčových čísel a aktivit"}
                {activePage === "chat" && "Back office asistent"}
                {activePage === "klienti" && "Přehled všech klientů z Google Sheets"}
                {activePage === "nemovitosti" && "Přehled všech nemovitostí z Google Sheets"}
                {activePage === "leady" && "Přehled všech leadů z Google Sheets"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((d) => { const next = !d; sessionStorage.setItem("dark", next ? "1" : "0"); return next; })}
              className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors flex-shrink-0"
              style={{ background: dark ? "#2a2a2a" : "var(--yellow)", border: "1px solid var(--border)" }}
              title={dark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
            >
              <svg className="absolute left-1.5 w-3.5 h-3.5 transition-opacity" style={{ opacity: dark ? 0.25 : 0 }} viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="#000"/>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <svg className="absolute right-1.5 w-3.5 h-3.5 transition-opacity" style={{ opacity: dark ? 0.5 : 0 }} viewBox="0 0 16 16" fill="none">
                <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" fill="var(--muted)"/>
              </svg>
              <span
                className="inline-flex items-center justify-center h-5 w-5 transform rounded-full transition-transform shadow-sm"
                style={{
                  background: dark ? "var(--surface-elevated)" : "white",
                  transform: dark ? "translateX(1.75rem)" : "translateX(0.2rem)",
                }}
              >
                {dark
                  ? <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" fill="#FFD600"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="#000"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>
                }
              </span>
            </button>
            {activePage === "chat" && (
              <button
                onClick={() => { setMessages([]); sessionStorage.removeItem("cache:messages"); }}
                className="text-xs transition-colors hover:opacity-100 opacity-60"
                style={{ color: "var(--muted)" }}
              >
                Vyčistit
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            background: "var(--bg)",
            backgroundImage: dark
              ? "radial-gradient(ellipse 85% 65% at 100% 0%, rgba(255,214,0,0.13) 0%, transparent 70%)"
              : "radial-gradient(ellipse 85% 65% at 100% 0%, rgba(255,180,0,0.09) 0%, transparent 70%)",
          }}
        >
          {activePage === "dashboard" && (
            <DashboardView
              onChatPrompt={(prompt) => {
                setActivePage("chat");
                sessionStorage.setItem("activePage", "chat");
                sendMessage(prompt);
              }}
            />
          )}
          {activePage === "chat" && (
            <MessageList messages={messages} dark={dark} onSend={sendMessage} />
          )}
          {activePage === "klienti" && <ClientsView />}
          {activePage === "nemovitosti" && <PropertiesView />}
          {activePage === "leady" && <LeadsView />}
        </div>

        {/* Chat input — above bottom nav */}
        {activePage === "chat" && (
          <ChatInput onSend={sendMessage} disabled={loading} dark={dark} hasMessages={messages.length > 0} model={model} setModel={setModel} />
        )}

        {/* Bottom nav — mobile only */}
        <nav
          className="md:hidden flex flex-shrink-0"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.page;
            return (
              <button
                key={item.label}
                onClick={() => { setActivePage(item.page); sessionStorage.setItem("activePage", item.page); }}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors"
                style={{ color: isActive ? "var(--yellow)" : "var(--muted)" }}
              >
                <span>
                  {item.icon(false)}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
