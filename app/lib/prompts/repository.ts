import type { Prompt, PromptInput, PromptPatch } from "./types";

/** Storage boundary. Phase 2: localStorage. Phase 3: Supabase. UI code only talks to this. */
export interface PromptRepository {
  list(): Promise<Prompt[]>; // newest first (createdAt desc)
  create(input: PromptInput): Promise<Prompt>; // assigns id + timestamps
  update(id: string, patch: PromptPatch): Promise<Prompt>; // bumps updatedAt; throws if id missing
  remove(id: string): Promise<void>; // no-op if already gone
  restore(prompt: Prompt): Promise<void>; // re-insert exactly as given (undo)
  addMany(prompts: Prompt[]): Promise<void>; // import; caller already de-duplicated
  subscribe(onExternalChange: () => void): () => void; // changes made elsewhere (other tabs now, realtime later)
}
