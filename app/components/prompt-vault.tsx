"use client";

import { AddPromptForm } from "@/app/components/add-prompt-form";
import { PromptCard } from "@/app/components/prompt-card";
import { usePrompts } from "@/app/components/prompts-provider";

const emptyBox =
  "rounded-card border-[1.5px] border-dashed border-muted/35 px-6 py-12 text-center text-[14.5px]";

export function PromptVault() {
  const { status, prompts } = usePrompts();

  return (
    <div className="grid grid-cols-1 items-start gap-7 min-[901px]:grid-cols-[minmax(300px,380px)_1fr]">
      <AddPromptForm />
      <section aria-labelledby="saved-prompts-heading">
        <div className="mb-5 flex items-center justify-between">
          {/* tabIndex -1: focus lands here after a card is deleted */}
          <h2 id="saved-prompts-heading" tabIndex={-1} className="text-[24px] focus:outline-none">
            Saved Prompts
          </h2>
          {status === "ready" && (
            <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-hl-1/14 px-2 text-[13px] font-extrabold text-hl-1 dark:bg-hl-1/20">
              {prompts.length}
            </span>
          )}
        </div>
        {/* "loading" renders no body: localStorage resolves within a frame, so a message would only flicker. */}
        {status === "error" ? (
          <div className={`${emptyBox} text-hl-2`}>
            Couldn&apos;t load your prompts. Your browser may be blocking local storage.
          </div>
        ) : status === "ready" ? (
          prompts.length === 0 ? (
            <div className={`${emptyBox} text-muted`}>No prompts saved yet. Add your first one!</div>
          ) : (
            <div className="flex flex-col gap-[18px]">
              {prompts.map((p) => (
                <PromptCard key={p.id} prompt={p} />
              ))}
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
