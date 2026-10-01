"use client";

import { useId } from "react";
import { field, label } from "@/app/components/styles";
import { MODEL_MAX, TITLE_MAX, type PromptInput } from "@/app/lib/prompts/types";

type PromptFieldsProps = {
  values: PromptInput;
  onChange: (values: PromptInput) => void;
  contentRows: number; // 7 in the add form, 6 in edit mode
  titleRef?: React.Ref<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler; // edit mode uses this for Escape
};

export function PromptFields({ values, onChange, contentRows, titleRef, onKeyDown }: PromptFieldsProps) {
  const id = useId();

  return (
    <>
      <label className={label} htmlFor={`${id}-title`}>
        Title
      </label>
      <input
        ref={titleRef}
        id={`${id}-title`}
        className={`${field} text-[14.5px]`}
        type="text"
        maxLength={TITLE_MAX}
        placeholder="e.g. Blog Idea Generator"
        value={values.title}
        onChange={(e) => onChange({ ...values, title: e.target.value })}
        onKeyDown={onKeyDown}
      />
      <p className="mt-2 mb-5 text-[12.5px] text-muted">Required. Max {TITLE_MAX} characters.</p>

      <label className={label} htmlFor={`${id}-model`}>
        Model
      </label>
      <input
        id={`${id}-model`}
        className={`${field} font-mono text-[14px]`}
        type="text"
        maxLength={MODEL_MAX}
        placeholder="e.g. gpt-4o-mini"
        value={values.model}
        onChange={(e) => onChange({ ...values, model: e.target.value })}
        onKeyDown={onKeyDown}
      />
      <p className="mt-2 mb-5 text-[12.5px] text-muted">
        Required. Model identifier (max {MODEL_MAX} chars).
      </p>

      <label className={label} htmlFor={`${id}-content`}>
        Content
      </label>
      <textarea
        id={`${id}-content`}
        className={`${field} text-[14.5px] resize-y leading-[1.5]`}
        rows={contentRows}
        placeholder="Enter the full prompt here..."
        value={values.content}
        onChange={(e) => onChange({ ...values, content: e.target.value })}
        onKeyDown={onKeyDown}
      />
      <p className="mt-2 mb-5 text-[12.5px] text-muted">Required.</p>
    </>
  );
}
