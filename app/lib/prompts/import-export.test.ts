import { describe, expect, it } from "vitest";
import sample from "../../../fixtures/sample-prompts.json";
import { buildExportFile, describeMergeResult, mergeImport, type MergeResult } from "./import-export";
import type { Prompt } from "./types";
import { parseExportFile } from "./validate";

const now = new Date("2026-10-01T12:00:00.000Z");
let counter = 0;
const deps = { now, newId: () => `new-${++counter}` };

function prompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: "p1",
    title: "Title",
    model: "gpt-4o",
    content: "Content",
    rating: 2,
    note: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mergeImport", () => {
  it("adds new items with a generated id and now filled in", () => {
    counter = 0;
    const result = mergeImport([], [{ title: "A", model: "m", content: "c" }], deps);
    expect(result.duplicates).toBe(0);
    expect(result.invalid).toBe(0);
    expect(result.toAdd).toEqual([
      {
        id: "new-1",
        title: "A",
        model: "m",
        content: "c",
        rating: 0,
        note: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ]);
  });

  it("fills a missing updatedAt with createdAt", () => {
    const result = mergeImport(
      [],
      [{ title: "A", model: "m", content: "c", createdAt: "2026-01-02T03:04:05.000Z" }],
      deps,
    );
    expect(result.toAdd[0].updatedAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("counts a matching id as a duplicate", () => {
    const result = mergeImport([prompt()], [prompt({ title: "Different", content: "Other" })], deps);
    expect(result.toAdd).toEqual([]);
    expect(result.duplicates).toBe(1);
  });

  it("counts matching title, model and content with a different id as a duplicate", () => {
    const result = mergeImport([prompt()], [prompt({ id: "other" })], deps);
    expect(result.toAdd).toEqual([]);
    expect(result.duplicates).toBe(1);
  });

  it("compares the content key after trimming, and case-sensitively", () => {
    const existing = [prompt()];
    const trimmed = mergeImport(existing, [prompt({ id: "x", title: "  Title " })], deps);
    expect(trimmed.duplicates).toBe(1);
    const cased = mergeImport(existing, [prompt({ id: "y", title: "title" })], deps);
    expect(cased.duplicates).toBe(0);
    expect(cased.toAdd).toHaveLength(1);
  });

  it("counts duplicates within the same file after the first one", () => {
    const a = prompt({ id: "a" });
    const sameId = prompt({ id: "a", title: "Other", content: "Other" });
    const sameContent = prompt({ id: "b" });
    const result = mergeImport([], [a, sameId, sameContent], deps);
    expect(result.toAdd).toHaveLength(1);
    expect(result.toAdd[0].id).toBe("a");
    expect(result.duplicates).toBe(2);
  });

  it("counts invalid entries", () => {
    const result = mergeImport([], [null, "text", { title: "", model: "m", content: "c" }, prompt()], deps);
    expect(result.invalid).toBe(3);
    expect(result.toAdd).toHaveLength(1);
  });

  it("never modifies an existing prompt", () => {
    const existing = [prompt({ rating: 4, note: "mine" })];
    const snapshot = structuredClone(existing);
    mergeImport(existing, [prompt({ rating: 1, note: "theirs", content: "changed" })], deps);
    mergeImport(existing, [prompt({ id: "other", rating: 1 })], deps);
    expect(existing).toEqual(snapshot);
  });

  it("preserves the original createdAt", () => {
    const result = mergeImport([], [prompt({ id: "old", createdAt: "2020-05-05T05:05:05.000Z" })], deps);
    expect(result.toAdd[0].createdAt).toBe("2020-05-05T05:05:05.000Z");
  });

  it("imports the sample fixture, then reports it as all duplicates", () => {
    const parsed = parseExportFile(sample);
    expect(parsed).not.toBeNull();
    const first = mergeImport([], parsed!.items, deps);
    expect(first.toAdd.map((p) => p.id)).toEqual(["seed-1", "seed-2"]);
    expect(first.toAdd[0].createdAt).toBe("2026-09-18T09:47:00.000Z");
    const second = mergeImport(first.toAdd, parsed!.items, deps);
    expect(second).toEqual({ toAdd: [], duplicates: 2, invalid: 0 });
  });

  it("importing our own export adds nothing", () => {
    const library = [prompt({ id: "a" }), prompt({ id: "b", title: "B", content: "B" })];
    const file = buildExportFile(library, now);
    const result = mergeImport(library, parseExportFile(JSON.parse(JSON.stringify(file)))!.items, deps);
    expect(result).toEqual({ toAdd: [], duplicates: 2, invalid: 0 });
  });
});

describe("buildExportFile", () => {
  it("wraps prompts in the envelope", () => {
    const prompts = [prompt()];
    expect(buildExportFile(prompts, now)).toEqual({
      app: "promptvault",
      version: 1,
      exportedAt: "2026-10-01T12:00:00.000Z",
      prompts,
    });
  });
});

describe("describeMergeResult", () => {
  const added = (n: number) => Array.from({ length: n }, (_, i) => prompt({ id: `p${i}` }));
  const result = (toAdd: number, duplicates: number, invalid: number): MergeResult => ({
    toAdd: added(toAdd),
    duplicates,
    invalid,
  });

  it("describes a clean import", () => {
    expect(describeMergeResult(result(3, 0, 0))).toBe("Imported 3 prompts.");
    expect(describeMergeResult(result(1, 0, 0))).toBe("Imported 1 prompt.");
  });

  it("describes skipped duplicates and invalid entries", () => {
    expect(describeMergeResult(result(3, 2, 1))).toBe(
      "Imported 3 prompts. Skipped 2 duplicates and 1 invalid entry.",
    );
    expect(describeMergeResult(result(1, 1, 0))).toBe("Imported 1 prompt. Skipped 1 duplicate.");
    expect(describeMergeResult(result(2, 0, 2))).toBe("Imported 2 prompts. Skipped 2 invalid entries.");
  });

  it("describes an import that added nothing", () => {
    expect(describeMergeResult(result(0, 4, 0))).toBe("No new prompts to import. 4 duplicates skipped.");
    expect(describeMergeResult(result(0, 1, 0))).toBe("No new prompts to import. 1 duplicate skipped.");
    expect(describeMergeResult(result(0, 4, 1))).toBe(
      "No new prompts to import. 4 duplicates and 1 invalid entry skipped.",
    );
    expect(describeMergeResult(result(0, 0, 2))).toBe("No new prompts to import. 2 invalid entries skipped.");
    expect(describeMergeResult(result(0, 0, 0))).toBe("No new prompts to import.");
  });
});
