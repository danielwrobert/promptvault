export const TITLE_MAX = 120;
export const MODEL_MAX = 100;
export const CONTENT_MAX = 50_000;
export const NOTE_MAX = 10_000;

export type Prompt = {
  id: string; // UUID
  title: string; // 1..TITLE_MAX, trimmed
  model: string; // 1..MODEL_MAX, trimmed
  content: string; // 1..CONTENT_MAX, trimmed
  rating: number; // integer 0–5; 0 = unrated
  note: string | null; // trimmed, null when empty
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

/** Fields a user types in the add/edit forms. */
export type PromptInput = Pick<Prompt, "title" | "model" | "content">;

/** Fields that can change after creation. */
export type PromptPatch = Partial<Pick<Prompt, "title" | "model" | "content" | "rating" | "note">>;
