"use client";

import { useState } from "react";
import { field, pillSmall } from "@/app/components/styles";

type PromptNotesProps = {
  note: string | null;
  onChange: (note: string | null) => void;
};

export function PromptNotes({ note, onChange }: PromptNotesProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function openEditor() {
    setDraft(note ?? "");
    setEditing(true);
  }

  function save() {
    onChange(draft.trim() || null);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft("");
  }

  function deleteNote() {
    onChange(null);
    setEditing(false);
  }

  return (
    <div className="mt-[18px] border-t border-muted/35 pt-[18px]">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-extrabold tracking-[.08em] text-muted">Notes</span>
        {!editing && (
          <button
            type="button"
            onClick={openEditor}
            className={`${pillSmall} border border-hl-1 px-3 py-[5px] text-hl-1`}
          >
            {note ? "Edit" : "Add"}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            className={`${field} text-[14.5px] resize-y leading-[1.5] mb-2.5`}
            rows={3}
            placeholder="Add a note about this prompt..."
            aria-label="Note"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className={`${pillSmall} px-3.5 py-[7px] border-0 bg-hl-1 text-white dark:text-page`}
            >
              Save Note
            </button>
            <button
              type="button"
              onClick={cancel}
              className={`${pillSmall} px-3.5 py-[7px] border border-muted/35 text-ink`}
            >
              Cancel
            </button>
            {note && (
              <button
                type="button"
                onClick={deleteNote}
                className={`${pillSmall} px-3.5 py-[7px] border border-hl-2/50 text-hl-2`}
              >
                Delete Note
              </button>
            )}
          </div>
        </div>
      ) : note ? (
        <div className="rounded-r-field border-l-[3px] border-hl-5 bg-hl-5/8 px-3.5 py-3 text-[13.5px] leading-[1.55] text-ink whitespace-pre-wrap dark:bg-hl-5/14">
          {note}
        </div>
      ) : (
        <p className="m-0 text-[13.5px] text-muted">No notes yet.</p>
      )}
    </div>
  );
}
