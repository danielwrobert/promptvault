import { describe, expect, it } from "vitest";
import { buildSearchIndex, filterPrompts } from "./search";
import type { Prompt } from "./types";

function make(id: string, overrides: Partial<Prompt> = {}): Prompt {
  return {
    id,
    title: `Title ${id}`,
    model: "gpt-4o",
    content: `Content ${id}`,
    rating: 0,
    note: null,
    createdAt: "2026-09-18T09:47:00.000Z",
    updatedAt: "2026-09-18T09:47:00.000Z",
    ...overrides,
  };
}

function search(prompts: Prompt[], query: string): string[] {
  return filterPrompts(buildSearchIndex(prompts), query).map((p) => p.id);
}

describe("filterPrompts", () => {
  const prompts = [make("a"), make("b"), make("c")];

  it("returns every prompt, in order, for an empty or whitespace query", () => {
    expect(search(prompts, "")).toEqual(["a", "b", "c"]);
    expect(search(prompts, "   \n\t ")).toEqual(["a", "b", "c"]);
  });

  it("matches title, content, model and note independently", () => {
    const list = [
      make("t", { title: "zebra" }),
      make("c", { content: "giraffe" }),
      make("m", { model: "llama" }),
      make("n", { note: "otter" }),
    ];
    expect(search(list, "zebra")).toEqual(["t"]);
    expect(search(list, "giraffe")).toEqual(["c"]);
    expect(search(list, "llama")).toEqual(["m"]);
    expect(search(list, "otter")).toEqual(["n"]);
  });

  it("is case-insensitive on both sides", () => {
    const list = [make("a", { title: "Summarize Report" })];
    expect(search(list, "SUMMARIZE")).toEqual(["a"]);
    expect(search(list, "report")).toEqual(["a"]);
  });

  it("ANDs multiple words across fields, in any order", () => {
    const list = [
      make("a", { title: "email draft", model: "claude" }),
      make("b", { title: "email draft", model: "gpt" }),
    ];
    expect(search(list, "claude email")).toEqual(["a"]);
    expect(search(list, "email claude")).toEqual(["a"]);
    expect(search(list, "email")).toEqual(["a", "b"]);
  });

  it("returns an empty list when a word matches nothing", () => {
    expect(search(prompts, "email nonexistent")).toEqual([]);
  });

  it("handles a null note and does not match the word 'null'", () => {
    const list = [make("a", { note: null })];
    expect(search(list, "title")).toEqual(["a"]);
    expect(search(list, "null")).toEqual([]);
  });

  it("treats regex characters literally", () => {
    const list = [
      make("dot", { title: "a.b" }),
      make("plain", { title: "axb" }),
      make("paren", { title: "f(x)" }),
      make("bracket", { title: "[tag]" }),
      make("star", { title: "2*3" }),
      make("slash", { title: "back\\slash" }),
    ];
    expect(search(list, "a.b")).toEqual(["dot"]);
    expect(search(list, "(")).toEqual(["paren"]);
    expect(search(list, "[")).toEqual(["bracket"]);
    expect(search(list, "*")).toEqual(["star"]);
    expect(search(list, "\\")).toEqual(["slash"]);
  });

  it("does not match a term across a field boundary", () => {
    const list = [make("a", { title: "foo", content: "bar" })];
    expect(search(list, "foobar")).toEqual([]);
  });

  it("keeps the input order", () => {
    const list = [make("z", { title: "match" }), make("a", { title: "match" }), make("m", { title: "match" })];
    expect(search(list, "match")).toEqual(["z", "a", "m"]);
  });
});

describe("buildSearchIndex", () => {
  it("does not mutate its input", () => {
    const list = [make("a", { title: "MiXeD" })];
    const snapshot = structuredClone(list);
    buildSearchIndex(list);
    expect(list).toEqual(snapshot);
  });

  it("lowercases the haystack but keeps the original prompt", () => {
    const [entry] = buildSearchIndex([make("a", { title: "MiXeD" })]);
    expect(entry.haystack).toContain("mixed");
    expect(entry.prompt.title).toBe("MiXeD");
  });
});
