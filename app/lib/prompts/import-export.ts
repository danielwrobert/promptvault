import { pluralize } from "./format";
import type { Prompt } from "./types";
import { parsePrompt } from "./validate";

export type ExportFile = {
  app: "promptvault";
  version: 1;
  exportedAt: string;
  prompts: Prompt[];
};

export function buildExportFile(prompts: Prompt[], now: Date): ExportFile {
  return { app: "promptvault", version: 1, exportedAt: now.toISOString(), prompts };
}

export type MergeResult = {
  toAdd: Prompt[]; // fully-formed, ready to persist
  duplicates: number;
  invalid: number;
};

function contentKey(p: { title: string; model: string; content: string }): string {
  return `${p.title.trim()}\u0000${p.model.trim()}\u0000${p.content.trim()}`;
}

/**
 * Merge imported items into the library. An item is a duplicate when its id or
 * its content key (title + model + content, case-sensitive) matches an existing
 * prompt or one already accepted from the same file. Existing prompts are never
 * touched and imported prompts keep their original createdAt.
 */
export function mergeImport(
  existing: Prompt[],
  items: unknown[],
  deps: { now: Date; newId: () => string },
): MergeResult {
  const seenIds = new Set(existing.map((p) => p.id));
  const seenKeys = new Set(existing.map(contentKey));
  const toAdd: Prompt[] = [];
  let duplicates = 0;
  let invalid = 0;

  for (const item of items) {
    const parsed = parsePrompt(item);
    if (!parsed) {
      invalid++;
      continue;
    }
    const key = contentKey(parsed);
    if ((parsed.id !== undefined && seenIds.has(parsed.id)) || seenKeys.has(key)) {
      duplicates++;
      continue;
    }
    const createdAt = parsed.createdAt ?? deps.now.toISOString();
    const prompt: Prompt = {
      ...parsed,
      id: parsed.id ?? deps.newId(),
      createdAt,
      updatedAt: parsed.updatedAt ?? createdAt,
    };
    seenIds.add(prompt.id);
    seenKeys.add(key);
    toAdd.push(prompt);
  }

  return { toAdd, duplicates, invalid };
}

export function describeMergeResult(result: MergeResult): string {
  const added = result.toAdd.length;
  const skipped = [
    result.duplicates > 0 ? pluralize(result.duplicates, "duplicate") : null,
    result.invalid > 0 ? pluralize(result.invalid, "invalid entry", "invalid entries") : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" and ");

  if (added > 0) {
    const imported = `Imported ${pluralize(added, "prompt")}.`;
    return skipped ? `${imported} Skipped ${skipped}.` : imported;
  }
  return skipped ? `No new prompts to import. ${skipped} skipped.` : "No new prompts to import.";
}
