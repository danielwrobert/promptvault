import type { Prompt } from "./types";

export const PAGE_SIZE = 10;

export type SearchIndexEntry = { prompt: Prompt; haystack: string };

/** Lowercased "title\ncontent\nmodel\nnote" per prompt, built once per list change. */
export function buildSearchIndex(prompts: readonly Prompt[]): SearchIndexEntry[] {
  return prompts.map((prompt) => ({
    prompt,
    haystack: [prompt.title, prompt.content, prompt.model, prompt.note ?? ""].join("\n").toLowerCase(),
  }));
}

/** Matching prompts in index order. An empty or whitespace query returns every prompt. */
export function filterPrompts(index: readonly SearchIndexEntry[], query: string): Prompt[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return index.map((entry) => entry.prompt);
  return index
    .filter((entry) => terms.every((term) => entry.haystack.includes(term)))
    .map((entry) => entry.prompt);
}
