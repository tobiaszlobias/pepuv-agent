"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  dark: boolean;
  hasMessages?: boolean;
}

const QUICK_PROMPTS = [
  "Noví klienti Q1",
  "Vývoj leadů 6 měs",
  "Email zájemci",
  "Chybějící rekonstrukce",
  "Týdenní report",
  "Sreality Holešovice",
];

const QUICK_PROMPTS_FULL = [
  "Jací noví klienti za Q1 2025?",
  "Ukáž vývoj leadů za posledních 6 měsíců",
  "Napiš email zájemci o prohlídku",
  "Nemovitosti bez dat o rekonstrukci",
  "Shrň výsledky minulého týdne",
  "Nové nabídky Praha Holešovice",
];

export function ChatInput({ onSend, disabled, hasMessages }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div
      className="px-4 pt-2 pb-3 flex-shrink-0 flex flex-col gap-2"
      style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
    >
      {/* Quick prompts — single scrollable row */}
      {hasMessages && (
        <div className="flex gap-1.5 overflow-x-auto">
          {QUICK_PROMPTS.map((label, i) => (
            <button
              key={label}
              onClick={() => onSend(QUICK_PROMPTS_FULL[i])}
              disabled={disabled}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.borderColor = "var(--yellow)";
                  e.currentTarget.style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              {label}
            </button>
          ))}
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
