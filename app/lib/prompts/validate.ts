import {
  CONTENT_MAX,
  MODEL_MAX,
  NOTE_MAX,
  TITLE_MAX,
  type Prompt,
  type PromptInput,
} from "./types";

/**
 * What `parsePrompt` returns. The id and timestamps may be missing in imported
 * files; the caller (import merge) fills them in.
 */
export type ParsedPrompt = Omit<Prompt, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function normalizeInput(input: PromptInput): PromptInput {
  return {
    title: input.title.trim(),
    model: input.model.trim(),
    content: input.content.trim(),
  };
}

function withinLimit(value: string, max: number): boolean {
  return value.length > 0 && value.length <= max;
}

export function isValidInput(input: PromptInput): boolean {
  const { title, model, content } = normalizeInput(input);
  return (
    withinLimit(title, TITLE_MAX) &&
    withinLimit(model, MODEL_MAX) &&
    withinLimit(content, CONTENT_MAX)
  );
}

export function clampRating(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(5, Math.max(0, Math.round(value)));
}

export function normalizeNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, NOTE_MAX).trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Unknown keys (e.g. the Phase 1 `tokens` / `date`) are dropped silently. */
export function parsePrompt(value: unknown): ParsedPrompt | null {
  if (!isRecord(value)) return null;
  const { title, model, content } = value;
  if (typeof title !== "string" || typeof model !== "string" || typeof content !== "string") {
    return null;
  }
  const input = normalizeInput({ title, model, content });
  if (!isValidInput(input)) return null;

  return {
    ...(typeof value.id === "string" && value.id !== "" ? { id: value.id } : {}),
    ...input,
    rating: clampRating(value.rating),
    note: normalizeNote(value.note),
    createdAt: normalizeTimestamp(value.createdAt),
    updatedAt: normalizeTimestamp(value.updatedAt),
  };
}

/** Accepts our export envelope or a bare array. Anything else is "not a PromptVault file". */
export function parseExportFile(json: unknown): { items: unknown[] } | null {
  if (Array.isArray(json)) return { items: json };
  if (
    isRecord(json) &&
    json.app === "promptvault" &&
    json.version === 1 &&
    Array.isArray(json.prompts)
  ) {
    return { items: json.prompts };
  }
  return null;
}
