"use client";

import { useState } from "react";
import type { Prompt } from "@/app/lib/prompts";
import { SEED_PROMPTS } from "@/app/lib/prompts";
import { AddPromptForm } from "@/app/components/add-prompt-form";
import { PromptCard } from "@/app/components/prompt-card";

export function PromptVault() {
  const [prompts, setPrompts] = useState<Prompt[]>(SEED_PROMPTS);

  function addPrompt(data: { title: string; model: string; content: string }) {
    setPrompts((prev) => [
      {
        id: crypto.randomUUID(),
        title: data.title,
        model: data.model,
        content: data.content,
        tokens: "—",
        date: "Just now",
        rating: 0,
        note: null,
      },
      ...prev,
    ]);
  }

  function deletePrompt(id: string) {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  }

  function ratePrompt(id: string, rating: number) {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, rating } : p)));
  }

  function setNote(id: string, note: string | null) {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, note } : p)));
  }

  return (
    <div className="grid grid-cols-1 items-start gap-7 min-[901px]:grid-cols-[minmax(300px,380px)_1fr]">
      <AddPromptForm onAdd={addPrompt} />
      <section aria-labelledby="saved-prompts-heading">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="saved-prompts-heading" className="text-[24px]">
            Saved Prompts
          </h2>
          <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-hl-1/14 px-2 text-[13px] font-extrabold text-hl-1 dark:bg-hl-1/20">
            {prompts.length}
          </span>
        </div>
        {prompts.length === 0 ? (
          <div className="rounded-card border-[1.5px] border-dashed border-muted/35 px-6 py-12 text-center text-[14.5px] text-muted">
            No prompts saved yet. Add your first one!
          </div>
        ) : (
          <div className="flex flex-col gap-[18px]">
            {prompts.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                onDelete={deletePrompt}
                onRate={ratePrompt}
                onNoteChange={setNote}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
