"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";

type ModelId = "claude-haiku-4-5-20251001" | "claude-sonnet-4-6" | "claude-opus-4-7";

const MODELS: { id: ModelId; label: string }[] = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku" },
  { id: "claude-sonnet-4-6",         label: "Sonnet" },
  { id: "claude-opus-4-7",           label: "Opus" },
];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  dark: boolean;
  hasMessages?: boolean;
  model: ModelId;
  setModel: (m: ModelId) => void;
}

const QUICK_PROMPTS = [
  { label: "Noví klienti Q1", prompt: "Jaké nové klienty máme za 1. kvartál? Odkud přišli? Můžeš to znázornit graficky?" },
  { label: "Vývoj leadů a prodejů", prompt: "Vytvoř graf vývoje počtu leadů a prodaných nemovitostí za posledních 6 měsíců." },
  { label: "Email zájemci", prompt: "Napiš e-mail pro zájemce o moji nemovitost a doporuč mu termín prohlídky na základě mé dostupnosti v kalendáři." },
  { label: "Chybějící rekonstrukce", prompt: "Najdi nemovitosti, u kterých nám v systému chybí data o rekonstrukci a stavebních úpravách a připrav jejich seznam k doplnění." },
  { label: "Týdenní report", prompt: "Shrň výsledky minulého týdne do krátkého reportu pro vedení a připrav k tomu prezentaci se třemi slidy." },
  { label: "Sreality Holešovice", prompt: "Sleduj všechny hlavní realitní servery a každé ráno mě informuj o nových nabídkách v lokalitě Praha Holešovice." },
];

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InlineModelPicker({ model, setModel, disabled }: { model: ModelId; setModel: (m: ModelId) => void; disabled: boolean }) {
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
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all disabled:opacity-40"
        style={{
          background: "var(--surface)",
          border: `1px solid ${open ? "var(--yellow)" : "var(--border)"}`,
          color: "var(--muted)",
        }}
        title="Přepnout model"
      >
        <span className="font-semibold" style={{ color: "var(--text)" }}>{current.label}</span>
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <ChevronDown />
        </span>
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-1.5 rounded-xl overflow-hidden z-20 w-32"
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
              {model === m.id && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="var(--yellow)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatInput({ onSend, disabled, hasMessages, model, setModel }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (promptRef.current && !promptRef.current.contains(e.target as Node)) {
        setPromptOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className="px-4 pt-2 pb-3 flex-shrink-0 flex flex-col gap-2"
      style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
    >
      {/* Quick prompts dropdown */}
      {hasMessages && (
        <div ref={promptRef} className="relative">
          <button
            onClick={() => setPromptOpen((o) => !o)}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: "var(--surface-elevated)",
              border: `1px solid ${promptOpen ? "var(--yellow)" : "var(--border)"}`,
              color: "var(--muted)",
            }}
          >
            <span>Návrhy dotazů</span>
            <span style={{ transform: promptOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
              <ChevronDown />
            </span>
          </button>

          {promptOpen && (
            <div
              className="absolute bottom-full left-0 mb-1.5 rounded-xl overflow-hidden z-10 min-w-[280px] max-w-[90vw]"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
            >
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { onSend(item.prompt); setPromptOpen(false); }}
                  disabled={disabled}
                  className="w-full text-left px-4 py-3 text-xs transition-colors flex flex-col gap-0.5"
                  style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="font-semibold text-xs" style={{ color: "var(--yellow)" }}>{item.label}</span>
                  <span style={{ color: "var(--muted)", lineHeight: 1.4 }}>{item.prompt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input row */}
      <div
        className="flex gap-2 items-end rounded-xl px-3 py-2"
        style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--yellow)")}
        onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="Zeptej se Pepova agenta…"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed py-1"
          style={{ color: "var(--text)" }}
        />
        <InlineModelPicker model={model} setModel={setModel} disabled={disabled} />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: value.trim() ? "var(--yellow)" : "var(--border)", color: "#000" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
