"use client";

import { useRef, useState } from "react";
import { PromptFields } from "@/app/components/prompt-fields";
import { usePrompts } from "@/app/components/prompts-provider";
import { card, focusRing } from "@/app/components/styles";
import type { PromptInput } from "@/app/lib/prompts/types";
import { isValidInput } from "@/app/lib/prompts/validate";

const EMPTY: PromptInput = { title: "", model: "", content: "" };

export function AddPromptForm({ onAdded }: { onAdded?: () => void }) {
  const { addPrompt } = usePrompts();
  const [values, setValues] = useState<PromptInput>(EMPTY);
  const [pending, setPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const canSave = isValidInput(values) && !pending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSave) return;
    setPending(true);
    try {
      await addPrompt(values);
      setValues(EMPTY);
      onAdded?.();
      titleRef.current?.focus();
    } catch {
      // keep what the user typed; the provider has already shown a toast
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={card}>
      <h2 className="mb-[22px] text-[21px]">Add Prompt</h2>
      <form onSubmit={handleSubmit} noValidate>
        <PromptFields values={values} onChange={setValues} contentRows={7} titleRef={titleRef} />

        <button
          type="submit"
          disabled={!canSave}
          className={`w-full rounded-field bg-hl-1 p-[13px] text-[14.5px] font-extrabold tracking-[.02em] text-white dark:text-page cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          Save Prompt
        </button>
      </form>
    </section>
  );
}
