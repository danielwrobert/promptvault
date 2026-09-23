import type { Prompt } from "@/app/lib/prompts";
import { card, focusRing } from "@/app/components/styles";
import { PromptNotes } from "@/app/components/prompt-notes";
import { StarRating } from "@/app/components/star-rating";

type PromptCardProps = {
  prompt: Prompt;
  onDelete: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onNoteChange: (id: string, note: string | null) => void;
};

export function PromptCard({ prompt, onDelete, onRate, onNoteChange }: PromptCardProps) {
  const { id, title, content, model, tokens, date, rating, note } = prompt;

  return (
    <article className={card}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="mb-1.5 text-[17px] font-extrabold break-words">{title}</h3>
          <p className="m-0 max-w-[60ch] line-clamp-2 text-[14px] leading-[1.5] text-muted">
            {content}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Delete ${title}`}
          onClick={() => onDelete(id)}
          className={`shrink-0 rounded-full border border-muted/45 px-3.5 py-[7px] text-[12px] font-extrabold uppercase tracking-[.04em] text-muted cursor-pointer transition-colors hover:border-hl-2 hover:text-hl-2 ${focusRing}`}
        >
          Delete
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="rounded-full bg-hl-2/12 px-3 py-[5px] font-mono text-[12.5px] font-semibold text-hl-2 dark:bg-hl-2/18">
          {model}
        </span>
        <span className="rounded-full border border-hl-3/55 px-3 py-[5px] font-mono text-[12.5px] font-semibold text-hl-3">
          Tokens: {tokens}
        </span>
        <span className="text-[13px] text-muted">{date}</span>
      </div>

      <StarRating value={rating} onChange={(r) => onRate(id, r)} />
      <PromptNotes note={note} onChange={(n) => onNoteChange(id, n)} />
    </article>
  );
}
