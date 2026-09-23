"use client";

import { useRef, useState } from "react";
import { card, field, focusRing, label } from "@/app/components/styles";

type AddPromptFormProps = {
  onAdd: (data: { title: string; model: string; content: string }) => void;
};

export function AddPromptForm({ onAdd }: AddPromptFormProps) {
  const [title, setTitle] = useState("");
  const [model, setModel] = useState("");
  const [content, setContent] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const canSave = [title, model, content].every((v) => v.trim() !== "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSave) return;
    onAdd({ title: title.trim(), model: model.trim(), content: content.trim() });
    setTitle("");
    setModel("");
    setContent("");
    titleRef.current?.focus();
  }

  return (
    <section className={card}>
      <h2 className="mb-[22px] text-[21px]">Add Prompt</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label className={label} htmlFor="pv-title">
          Title
        </label>
        <input
          ref={titleRef}
          id="pv-title"
          className={`${field} text-[14.5px]`}
          type="text"
          maxLength={120}
          placeholder="e.g. Blog Idea Generator"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="mt-2 mb-5 text-[12.5px] text-muted">Required. Max 120 characters.</p>

        <label className={label} htmlFor="pv-model">
          Model
        </label>
        <input
          id="pv-model"
          className={`${field} font-mono text-[14px]`}
          type="text"
          maxLength={100}
          placeholder="e.g. gpt-4o-mini"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <p className="mt-2 mb-5 text-[12.5px] text-muted">Required. Model identifier (max 100 chars).</p>

        <label className={label} htmlFor="pv-content">
          Content
        </label>
        <textarea
          id="pv-content"
          className={`${field} text-[14.5px] resize-y leading-[1.5]`}
          rows={7}
          placeholder="Enter the full prompt here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <p className="mt-2 mb-5 text-[12.5px] text-muted">Required.</p>

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
