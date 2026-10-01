import type { Prompt } from "./types";

/** Newest first (createdAt desc); ties break by id so the order is stable. */
export function comparePrompts(a: Prompt, b: Prompt): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

export function sortPrompts(prompts: readonly Prompt[]): Prompt[] {
  return [...prompts].sort(comparePrompts);
}
