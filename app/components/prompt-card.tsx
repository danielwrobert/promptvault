"use client";

import { useEffect, useRef, useState } from "react";
import { formatPromptDate } from "@/app/lib/prompts/format";
import type { Prompt } from "@/app/lib/prompts/types";
import { PromptContent } from "@/app/components/prompt-content";
import { PromptEditor } from "@/app/components/prompt-editor";
import { PromptNotes } from "@/app/components/prompt-notes";
import { usePrompts } from "@/app/components/prompts-provider";
import { StarRating } from "@/app/components/star-rating";
import { card, pillOutline } from "@/app/components/styles";
import { useToast } from "@/app/components/toast";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const { id, title, content, model, rating, note, createdAt } = prompt;
  const { updatePrompt, deletePrompt, restorePrompt } = usePrompts();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  // After leaving edit mode the Edit button remounts; put keyboard focus back on it.
  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      editButtonRef.current?.focus();
    }
  }, [editing]);

  function closeEditor() {
    restoreFocus.current = true;
    setEditing(false);
  }

  async function handleDelete() {
    let removed: Prompt | null;
    try {
      removed = await deletePrompt(id);
    } catch {
      return; // the provider has already shown an error toast
    }
    // The card unmounts with the prompt; send focus somewhere stable instead of <body>.
    document.getElementById("saved-prompts-heading")?.focus();
    if (!removed) return;
    toast.show({
      message: `Deleted “${title}”.`,
      action: {
        label: "Undo",
        onClick: () => {
          restorePrompt(removed).catch(() => {
            // the provider has already shown an error toast
          });
        },
      },
    });
  }

  return (
    <article className={card}>
      {editing ? (
        <PromptEditor prompt={prompt} onDone={closeEditor} />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1 basis-[240px]">
              <h3 className="text-[17px] font-extrabold break-words">{title}</h3>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                ref={editButtonRef}
                type="button"
                aria-label={`Edit ${title}`}
                onClick={() => setEditing(true)}
                className={`${pillOutline} hover:border-hl-1 hover:text-hl-1`}
              >
                Edit
              </button>
              <button
                type="button"
                aria-label={`Delete ${title}`}
                onClick={handleDelete}
                className={`${pillOutline} hover:border-hl-2 hover:text-hl-2`}
              >
                Delete
              </button>
            </div>
          </div>

          <PromptContent content={content} />

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-hl-2/12 px-3 py-[5px] font-mono text-[12.5px] font-semibold text-hl-2 dark:bg-hl-2/18">
              {model}
            </span>
            {/* Formatted in the viewer's locale during render. Safe: cards only render after the
                client has loaded from storage, so this is never server-rendered. */}
            <time dateTime={createdAt} className="text-[13px] text-muted">
              {formatPromptDate(createdAt)}
            </time>
          </div>
        </>
      )}

      <StarRating value={rating} onChange={(r) => updatePrompt(id, { rating: r }).catch(() => {})} />
      <PromptNotes note={note} onChange={(n) => updatePrompt(id, { note: n }).catch(() => {})} />
    </article>
  );
}
