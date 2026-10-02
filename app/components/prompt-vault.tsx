"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AddPromptForm } from "@/app/components/add-prompt-form";
import { PromptCard } from "@/app/components/prompt-card";
import { PromptSearch } from "@/app/components/prompt-search";
import { usePrompts } from "@/app/components/prompts-provider";
import { linkButton, pillAccent } from "@/app/components/styles";
import { buildSearchIndex, filterPrompts, PAGE_SIZE } from "@/app/lib/prompts/search";

const emptyBox =
  "rounded-card border-[1.5px] border-dashed border-muted/35 px-6 py-12 text-center text-[14.5px]";

export function PromptVault() {
  const { status, prompts } = usePrompts();
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusTargetId = useRef<string | null>(null);

  const index = useMemo(() => buildSearchIndex(prompts), [prompts]);
  const matches = useMemo(() => filterPrompts(index, query), [index, query]);
  const shown = matches.slice(0, visibleCount);

  // Every query change goes through here so the page size resets without an effect.
  function handleQueryChange(next: string) {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handleLoadMore() {
    focusTargetId.current = matches[shown.length]?.id ?? null;
    setVisibleCount((n) => n + PAGE_SIZE);
  }

  // After Load more, move focus to the first newly revealed card. Only reads and clears a ref.
  useEffect(() => {
    const id = focusTargetId.current;
    if (!id) return;
    focusTargetId.current = null;
    document
      .querySelector<HTMLElement>(`[data-prompt-id="${CSS.escape(id)}"] [data-card-focus]`)
      ?.focus();
  }, [visibleCount]);

  const showSearch = status === "ready" && (prompts.length > 0 || query !== "");

  return (
    <div className="grid grid-cols-1 items-start gap-7 min-[901px]:grid-cols-[minmax(300px,380px)_1fr]">
      <AddPromptForm onAdded={() => handleQueryChange("")} />
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
        {showSearch && (
          <PromptSearch
            value={query}
            onChange={handleQueryChange}
            inputRef={searchInputRef}
            resultCount={matches.length}
            total={prompts.length}
          />
        )}
        {/* "loading" renders no body: localStorage resolves within a frame, so a message would only flicker. */}
        {status === "error" ? (
          <div className={`${emptyBox} text-hl-2`}>
            Couldn&apos;t load your prompts. Your browser may be blocking local storage.
          </div>
        ) : status === "ready" ? (
          prompts.length === 0 ? (
            <div className={`${emptyBox} text-muted`}>No prompts saved yet. Add your first one!</div>
          ) : matches.length === 0 ? (
            <div className={`${emptyBox} text-muted`}>
              <p>No prompts match “{query}”.</p>
              <button
                type="button"
                onClick={() => {
                  handleQueryChange("");
                  searchInputRef.current?.focus();
                }}
                className={`${linkButton} mt-3`}
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-[18px]">
                {shown.map((p) => (
                  <PromptCard key={p.id} prompt={p} />
                ))}
              </div>
              {matches.length > shown.length && (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <p className="text-[13px] text-muted">
                    Showing {shown.length} of {matches.length}
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className={`${pillAccent} hover:bg-hl-1/10`}
                  >
                    Load more prompts
                  </button>
                </div>
              )}
            </>
          )
        ) : null}
      </section>
    </div>
  );
}
