import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalStorageRepository, STORAGE_KEY } from "./local-storage-repository";
import type { Prompt } from "./types";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const input = { title: "Title", model: "gpt-4o", content: "Content" };

function stored(id: string, createdAt: string, extra: Partial<Prompt> = {}): Prompt {
  return {
    id,
    title: `T-${id}`,
    model: "m",
    content: "c",
    rating: 0,
    note: null,
    createdAt,
    updatedAt: createdAt,
    ...extra,
  };
}

function seed(storage: Storage, prompts: unknown[]) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, prompts }));
}

describe("local storage repository", () => {
  let storage: MemoryStorage;
  let repo: ReturnType<typeof createLocalStorageRepository>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00.000Z"));
    storage = new MemoryStorage();
    repo = createLocalStorageRepository(storage);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("lists an empty library when nothing is stored", async () => {
    expect(await repo.list()).toEqual([]);
  });

  it("creates a prompt and lists it back", async () => {
    const created = await repo.create({ title: "  Title ", model: " gpt-4o ", content: " Content\n" });
    expect(created).toMatchObject({
      ...input,
      rating: 0,
      note: null,
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await repo.list()).toEqual([created]);
  });

  it("rejects invalid input on create", async () => {
    await expect(repo.create({ ...input, title: "   " })).rejects.toThrow();
    expect(await repo.list()).toEqual([]);
  });

  it("lists newest first, breaking ties by id", async () => {
    seed(storage, [
      stored("a", "2026-09-01T00:00:00.000Z"),
      stored("c", "2026-09-03T00:00:00.000Z"),
      stored("b", "2026-09-02T00:00:00.000Z"),
      stored("z", "2026-09-03T00:00:00.000Z"),
    ]);
    expect((await repo.list()).map((p) => p.id)).toEqual(["c", "z", "b", "a"]);
  });

  it("update bumps updatedAt, keeps createdAt and clamps the rating", async () => {
    const created = await repo.create(input);
    vi.setSystemTime(new Date("2026-10-02T08:00:00.000Z"));

    const updated = await repo.update(created.id, { title: " New ", rating: 9, note: "  hi " });
    expect(updated.title).toBe("New");
    expect(updated.rating).toBe(5);
    expect(updated.note).toBe("hi");
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe("2026-10-02T08:00:00.000Z");
    expect(await repo.list()).toEqual([updated]);

    expect((await repo.update(created.id, { rating: -3 })).rating).toBe(0);
    expect((await repo.update(created.id, { rating: 2.6 })).rating).toBe(3);
    expect((await repo.update(created.id, { note: null })).note).toBeNull();
  });

  it("update rejects an invalid text field", async () => {
    const created = await repo.create(input);
    await expect(repo.update(created.id, { content: "  " })).rejects.toThrow();
    expect((await repo.list())[0].content).toBe("Content");
  });

  it("update on a missing id throws", async () => {
    await expect(repo.update("nope", { rating: 1 })).rejects.toThrow(/not found/i);
  });

  it("remove and restore round-trip the exact object", async () => {
    const a = await repo.create(input);
    vi.setSystemTime(new Date("2026-10-02T00:00:00.000Z"));
    const b = await repo.update((await repo.create({ ...input, title: "B" })).id, { rating: 4, note: "n" });

    await repo.remove(a.id);
    expect((await repo.list()).map((p) => p.id)).toEqual([b.id]);

    await repo.restore(a);
    expect(await repo.list()).toEqual([b, a]);
  });

  it("remove is a no-op for a missing id, and restore never duplicates", async () => {
    const a = await repo.create(input);
    await repo.remove("nope");
    await repo.restore(a);
    expect(await repo.list()).toEqual([a]);
  });

  it("addMany appends and saves once", async () => {
    const setItem = vi.spyOn(storage, "setItem");
    await repo.addMany([stored("a", "2026-09-01T00:00:00.000Z"), stored("b", "2026-09-02T00:00:00.000Z")]);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect((await repo.list()).map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("backs up a corrupt stored value and lists an empty library", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    storage.setItem(STORAGE_KEY, "not json");

    expect(await repo.list()).toEqual([]);

    const backupKey = `${STORAGE_KEY}-corrupt-${Date.now()}`;
    expect(storage.getItem(backupKey)).toBe("not json");
    expect(storage.getItem(STORAGE_KEY)).toBe("not json"); // never overwritten by a read
    expect(consoleError).toHaveBeenCalled();
  });

  it("does not add another backup when an identical one already exists", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    storage.setItem(STORAGE_KEY, "not json");

    await repo.list();
    vi.setSystemTime(new Date("2026-10-01T12:00:05.000Z"));
    await repo.list();

    const backups = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) =>
      k?.startsWith(`${STORAGE_KEY}-corrupt-`),
    );
    expect(backups).toHaveLength(1);
  });

  it("treats a wrong-shaped envelope as corrupt", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, prompts: "nope" }));
    expect(await repo.list()).toEqual([]);
    expect(storage.getItem(`${STORAGE_KEY}-corrupt-${Date.now()}`)).not.toBeNull();
  });

  it("drops stored entries that have lost their id or are invalid", async () => {
    const { id: _id, ...noId } = stored("x", "2026-09-01T00:00:00.000Z");
    void _id;
    seed(storage, [noId, stored("ok", "2026-09-02T00:00:00.000Z"), { title: "", model: "m", content: "c", id: "bad" }, 7]);
    expect((await repo.list()).map((p) => p.id)).toEqual(["ok"]);
  });

  it("lets storage errors propagate", async () => {
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    await expect(repo.create(input)).rejects.toThrow();
  });
});
