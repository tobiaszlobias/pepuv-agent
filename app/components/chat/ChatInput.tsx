"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  dark: boolean;
}

const QUICK_PROMPTS = [
  "Jací noví klienti za Q1 2025?",
  "Ukáž vývoj leadů za posledních 6 měsíců",
  "Napiš email zájemci o prohlídku",
  "Nemovitosti bez dat o rekonstrukci",
  "Shrň výsledky minulého týdne",
  "Nové nabídky Praha Holešovice",
];

export function ChatInput({ onSend, disabled, dark }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // dark prop kept for future light mode extension
  void dark;

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
      className="px-4 py-3 flex-shrink-0"
      style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
    >
      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSend(prompt)}
            disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--surface-elevated)",
              color: "var(--yellow)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              if (!disabled) e.currentTarget.style.borderColor = "var(--yellow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="Zeptej se Pepa agenta... (Enter pro odeslání)"
          rows={1}
          className="flex-1 resize-none rounded-xl px-4 py-3 text-sm placeholder-[#888880] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--yellow)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--yellow)", color: "#000" }}
        >
          <span className="sr-only">Odeslat</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
