import { describe, expect, it } from "vitest";
import { CONTENT_MAX, MODEL_MAX, NOTE_MAX, TITLE_MAX } from "./types";
import { parseExportFile, parsePrompt } from "./validate";

const valid = {
  id: "abc",
  title: "Title",
  model: "gpt-4o",
  content: "Do the thing.",
  rating: 3,
  note: "A note",
  createdAt: "2026-09-18T09:47:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
};

describe("parsePrompt", () => {
  it("round-trips a valid prompt", () => {
    expect(parsePrompt(valid)).toEqual(valid);
  });

  it("trims title, model and content", () => {
    const result = parsePrompt({ ...valid, title: "  T  ", model: " m ", content: "\n c \n" });
    expect(result).toMatchObject({ title: "T", model: "m", content: "c" });
  });

  it.each(["title", "model", "content"])("rejects an empty or whitespace-only %s", (key) => {
    expect(parsePrompt({ ...valid, [key]: "" })).toBeNull();
    expect(parsePrompt({ ...valid, [key]: "   \n " })).toBeNull();
  });

  it("rejects non-objects and non-string text fields", () => {
    expect(parsePrompt(null)).toBeNull();
    expect(parsePrompt("text")).toBeNull();
    expect(parsePrompt([valid])).toBeNull();
    expect(parsePrompt({ ...valid, title: 5 })).toBeNull();
  });

  it("rejects text over the max length", () => {
    expect(parsePrompt({ ...valid, title: "a".repeat(TITLE_MAX + 1) })).toBeNull();
    expect(parsePrompt({ ...valid, model: "a".repeat(MODEL_MAX + 1) })).toBeNull();
    expect(parsePrompt({ ...valid, content: "a".repeat(CONTENT_MAX + 1) })).toBeNull();
  });

  it("accepts text exactly at the max length", () => {
    expect(parsePrompt({ ...valid, title: "a".repeat(TITLE_MAX) })).not.toBeNull();
  });

  it("clamps and rounds the rating instead of rejecting", () => {
    expect(parsePrompt({ ...valid, rating: 9 })?.rating).toBe(5);
    expect(parsePrompt({ ...valid, rating: -2 })?.rating).toBe(0);
    expect(parsePrompt({ ...valid, rating: 3.6 })?.rating).toBe(4);
    expect(parsePrompt({ ...valid, rating: "4" })?.rating).toBe(0);
    expect(parsePrompt({ ...valid, rating: undefined })?.rating).toBe(0);
    expect(parsePrompt({ ...valid, rating: NaN })?.rating).toBe(0);
  });

  it("turns an empty or whitespace note into null and trims the rest", () => {
    expect(parsePrompt({ ...valid, note: "" })?.note).toBeNull();
    expect(parsePrompt({ ...valid, note: "   " })?.note).toBeNull();
    expect(parsePrompt({ ...valid, note: undefined })?.note).toBeNull();
    expect(parsePrompt({ ...valid, note: 7 })?.note).toBeNull();
    expect(parsePrompt({ ...valid, note: "  hi  " })?.note).toBe("hi");
  });

  it("truncates a note at NOTE_MAX", () => {
    expect(parsePrompt({ ...valid, note: "a".repeat(NOTE_MAX + 50) })?.note).toHaveLength(NOTE_MAX);
  });

  it("drops unknown keys such as tokens and date", () => {
    const result = parsePrompt({ ...valid, tokens: "180–420 (medium)", date: "Sep 18, 9:47 AM" });
    expect(result).toEqual(valid);
    expect(result).not.toHaveProperty("tokens");
    expect(result).not.toHaveProperty("date");
  });

  it("returns a missing id and timestamps as undefined", () => {
    const result = parsePrompt({ title: "T", model: "m", content: "c" });
    expect(result?.id).toBeUndefined();
    expect(result?.createdAt).toBeUndefined();
    expect(result?.updatedAt).toBeUndefined();
    expect(parsePrompt({ ...valid, id: "" })?.id).toBeUndefined();
  });

  it("returns invalid timestamps as undefined and normalizes valid ones to ISO", () => {
    const bad = parsePrompt({ ...valid, createdAt: "not a date", updatedAt: 12 });
    expect(bad?.createdAt).toBeUndefined();
    expect(bad?.updatedAt).toBeUndefined();
    expect(parsePrompt({ ...valid, createdAt: "2026-09-18T09:47:00Z" })?.createdAt).toBe(
      "2026-09-18T09:47:00.000Z",
    );
  });
});

describe("parseExportFile", () => {
  it("accepts the export envelope", () => {
    const items = [valid];
    expect(parseExportFile({ app: "promptvault", version: 1, prompts: items })).toEqual({ items });
  });

  it("accepts a bare array", () => {
    expect(parseExportFile([valid, 1])).toEqual({ items: [valid, 1] });
  });

  it("rejects everything else", () => {
    expect(parseExportFile({})).toBeNull();
    expect(parseExportFile({ foo: 1 })).toBeNull();
    expect(parseExportFile("[]")).toBeNull();
    expect(parseExportFile(null)).toBeNull();
    expect(parseExportFile(42)).toBeNull();
    expect(parseExportFile({ app: "other", version: 1, prompts: [] })).toBeNull();
    expect(parseExportFile({ app: "promptvault", version: 2, prompts: [] })).toBeNull();
    expect(parseExportFile({ app: "promptvault", version: 1, prompts: "x" })).toBeNull();
  });
});
