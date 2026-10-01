"use client";

import { useEffect, useRef, useState } from "react";
import { PromptFields } from "@/app/components/prompt-fields";
import { usePrompts } from "@/app/components/prompts-provider";
import { pillFilled, pillOutlineMuted } from "@/app/components/styles";
import type { Prompt, PromptInput } from "@/app/lib/prompts/types";
import { isValidInput, normalizeInput } from "@/app/lib/prompts/validate";

type PromptEditorProps = {
  prompt: Prompt;
  onDone: () => void;
};

export function PromptEditor({ prompt, onDone }: PromptEditorProps) {
  const { updatePrompt } = usePrompts();
  const [values, setValues] = useState<PromptInput>({
    title: prompt.title,
    model: prompt.model,
    content: prompt.content,
  });
  const [pending, setPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const normalized = normalizeInput(values);
  const changed =
    normalized.title !== prompt.title ||
    normalized.model !== prompt.model ||
    normalized.content !== prompt.content;
  const canSave = isValidInput(values) && changed && !pending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSave) return;
    setPending(true);
    try {
      await updatePrompt(prompt.id, normalized);
      onDone();
    } catch {
      // stay in edit mode; the provider has already shown a toast
      setPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={`Edit ${prompt.title}`}>
      <PromptFields
        values={values}
        onChange={setValues}
        contentRows={6}
        titleRef={titleRef}
        onKeyDown={handleKeyDown}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSave}
          className={`${pillFilled} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Save
        </button>
        <button type="button" onClick={onDone} className={pillOutlineMuted}>
          Cancel
        </button>
      </div>
    </form>
  );
}
