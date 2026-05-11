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
    <div className={`border-t px-4 py-3 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSend(prompt)}
            disabled={disabled}
            className={`text-xs px-3 py-1 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              dark
                ? "bg-gray-800 text-indigo-400 hover:bg-gray-700"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
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
          className={`flex-1 resize-none rounded-xl border px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
            dark
              ? "bg-gray-800 border-gray-700 text-gray-100"
              : "bg-gray-50 border-gray-300 text-gray-900"
          }`}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
