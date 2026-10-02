"use client";

import { useRef } from "react";
import { field, linkButton } from "@/app/components/styles";

type PromptSearchProps = {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  resultCount: number;
  total: number;
};

export function PromptSearch({ value, onChange, inputRef, resultCount, total }: PromptSearchProps) {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? fallbackRef;
  const active = value.trim() !== "";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && value !== "") {
      e.preventDefault();
      onChange("");
    }
  }

  return (
    <div className="mb-5">
      <label htmlFor="prompt-search" className="sr-only">
        Search prompts
      </label>
      <div className="flex items-center gap-3">
        <input
          ref={ref}
          id="prompt-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search title, content, model or note…"
          autoComplete="off"
          className={`${field} min-w-0 flex-1 text-[14.5px]`}
        />
        {value !== "" && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              ref.current?.focus();
            }}
            className={`${linkButton} shrink-0`}
          >
            Clear
          </button>
        )}
      </div>
      {/* Always rendered so the live region exists before its text changes. */}
      <p aria-live="polite" className="mt-2 min-h-[20px] text-[13px] text-muted">
        {active ? `${resultCount} of ${total} ${total === 1 ? "prompt" : "prompts"}` : ""}
      </p>
    </div>
  );
}
