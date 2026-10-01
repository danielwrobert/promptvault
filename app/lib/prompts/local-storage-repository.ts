import type { PromptRepository } from "./repository";
import { sortPrompts } from "./sort";
import type { Prompt, PromptPatch } from "./types";
import { clampRating, isValidInput, normalizeInput, normalizeNote, parsePrompt } from "./validate";

export const STORAGE_KEY = "promptvault-prompts";
const CORRUPT_PREFIX = `${STORAGE_KEY}-corrupt-`;

export function createLocalStorageRepository(
  storage: Storage = window.localStorage,
): PromptRepository {
  function hasBackupOf(raw: string): boolean {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(CORRUPT_PREFIX) && storage.getItem(key) === raw) return true;
    }
    return false;
  }

  /**
   * Keeps the raw value under a new key so a corrupt library is never overwritten. The corrupt
   * value stays in place until the next save, so every load sees it again; skip the copy when an
   * identical backup already exists instead of adding one per load.
   */
  function quarantine(raw: string): Prompt[] {
    if (!hasBackupOf(raw)) storage.setItem(`${CORRUPT_PREFIX}${Date.now()}`, raw);
    console.error(
      `PromptVault: stored prompts could not be read. A copy was kept under "${CORRUPT_PREFIX}*".`,
    );
    return [];
  }

  // Storage access can throw (private mode, blocked access); let it propagate.
  function load(): Prompt[] {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return [];

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return quarantine(raw);
    }
    if (
      typeof data !== "object" ||
      data === null ||
      (data as { version?: unknown }).version !== 1 ||
      !Array.isArray((data as { prompts?: unknown }).prompts)
    ) {
      return quarantine(raw);
    }

    const loadedAt = new Date().toISOString();
    const prompts: Prompt[] = [];
    for (const entry of (data as { prompts: unknown[] }).prompts) {
      const parsed = parsePrompt(entry);
      if (!parsed || !parsed.id) continue;
      const createdAt = parsed.createdAt ?? parsed.updatedAt ?? loadedAt;
      prompts.push({
        ...parsed,
        id: parsed.id,
        createdAt,
        updatedAt: parsed.updatedAt ?? createdAt,
      });
    }
    return prompts;
  }

  // A failed write (e.g. QuotaExceededError) propagates.
  function save(prompts: Prompt[]): void {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, prompts }));
  }

  return {
    async list() {
      return sortPrompts(load());
    },

    async create(input) {
      const normalized = normalizeInput(input);
      if (!isValidInput(normalized)) throw new Error("Invalid prompt");
      const now = new Date().toISOString();
      const prompt: Prompt = {
        id: crypto.randomUUID(),
        ...normalized,
        rating: 0,
        note: null,
        createdAt: now,
        updatedAt: now,
      };
      save([...load(), prompt]);
      return prompt;
    },

    async update(id, patch: PromptPatch) {
      const prompts = load();
      const existing = prompts.find((p) => p.id === id);
      if (!existing) throw new Error(`Prompt not found: ${id}`);

      const fields = normalizeInput({
        title: patch.title ?? existing.title,
        model: patch.model ?? existing.model,
        content: patch.content ?? existing.content,
      });
      if (!isValidInput(fields)) throw new Error("Invalid prompt");

      const updated: Prompt = {
        ...existing,
        ...fields,
        rating: patch.rating === undefined ? existing.rating : clampRating(patch.rating),
        note: patch.note === undefined ? existing.note : normalizeNote(patch.note),
        updatedAt: new Date().toISOString(),
      };
      save(prompts.map((p) => (p.id === id ? updated : p)));
      return updated;
    },

    async remove(id) {
      const prompts = load();
      const remaining = prompts.filter((p) => p.id !== id);
      if (remaining.length !== prompts.length) save(remaining);
    },

    async restore(prompt) {
      const prompts = load();
      if (prompts.some((p) => p.id === prompt.id)) return;
      save([...prompts, prompt]);
    },

    async addMany(prompts) {
      if (prompts.length === 0) return;
      save([...load(), ...prompts]);
    },

    subscribe(onExternalChange) {
      function onStorage(event: StorageEvent) {
        // key === null means localStorage.clear()
        if (event.key === STORAGE_KEY || event.key === null) onExternalChange();
      }
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
  };
}
