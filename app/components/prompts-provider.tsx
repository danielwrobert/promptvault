"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mergeImport, type MergeResult } from "@/app/lib/prompts/import-export";
import { createLocalStorageRepository } from "@/app/lib/prompts/local-storage-repository";
import type { PromptRepository } from "@/app/lib/prompts/repository";
import { sortPrompts } from "@/app/lib/prompts/sort";
import type { Prompt, PromptInput, PromptPatch } from "@/app/lib/prompts/types";
import { useToast } from "@/app/components/toast";

type Status = "loading" | "ready" | "error";

type State = { status: Status; prompts: Prompt[]; error: string | null };

type PromptsContextValue = State & {
  addPrompt: (input: PromptInput) => Promise<Prompt>;
  updatePrompt: (id: string, patch: PromptPatch) => Promise<Prompt>;
  /** Resolves to the removed prompt (for Undo), or null if it was already gone. */
  deletePrompt: (id: string) => Promise<Prompt | null>;
  restorePrompt: (prompt: Prompt) => Promise<void>;
  importPrompts: (items: unknown[]) => Promise<MergeResult>;
  reload: () => Promise<void>;
};

const SAVE_ERROR = "Couldn't save your changes. Your browser storage may be full or disabled.";

const PromptsContext = createContext<PromptsContextValue | null>(null);

function upsert(prompts: Prompt[], ...incoming: Prompt[]): Prompt[] {
  const ids = new Set(incoming.map((p) => p.id));
  return sortPrompts([...prompts.filter((p) => !ids.has(p.id)), ...incoming]);
}

export function PromptsProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository?: PromptRepository;
}) {
  const toast = useToast();
  const [state, setState] = useState<State>({ status: "loading", prompts: [], error: null });
  // Created on first use, in the browser only (the server render never touches storage).
  const repoRef = useRef<PromptRepository | undefined>(repository);

  const getRepository = useCallback((): PromptRepository => {
    repoRef.current ??= createLocalStorageRepository();
    return repoRef.current;
  }, []);

  const load = useCallback(
    (repo: PromptRepository) =>
      repo.list().then((prompts) => setState({ status: "ready", prompts, error: null })),
    [],
  );

  const fail = useCallback((err: unknown) => {
    console.error(err);
    setState({ status: "error", prompts: [], error: err instanceof Error ? err.message : String(err) });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // Everything runs in a promise callback so setState never fires synchronously in the effect.
    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        const repo = getRepository();
        unsubscribe = repo.subscribe(() => {
          if (!cancelled) load(repo).catch(fail);
        });
        return load(repo);
      })
      .catch((err) => {
        if (!cancelled) fail(err);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [getRepository, load, fail]);

  const reload = useCallback(() => load(getRepository()).catch(fail), [getRepository, load, fail]);

  /** Runs a repository call; on failure shows an error toast and re-throws so callers keep their form state. */
  const run = useCallback(
    async <T,>(fn: (repo: PromptRepository) => Promise<T>): Promise<T> => {
      try {
        return await fn(getRepository());
      } catch (err) {
        console.error(err);
        toast.show({ message: SAVE_ERROR, tone: "error" });
        throw err;
      }
    },
    [getRepository, toast],
  );

  const addPrompt = useCallback(
    async (input: PromptInput) => {
      const created = await run((repo) => repo.create(input));
      setState((s) => ({ ...s, prompts: upsert(s.prompts, created) }));
      return created;
    },
    [run],
  );

  const updatePrompt = useCallback(
    async (id: string, patch: PromptPatch) => {
      const updated = await run((repo) => repo.update(id, patch));
      setState((s) => ({ ...s, prompts: upsert(s.prompts, updated) }));
      return updated;
    },
    [run],
  );

  const deletePrompt = useCallback(
    async (id: string) => {
      const removed = state.prompts.find((p) => p.id === id) ?? null;
      await run((repo) => repo.remove(id));
      setState((s) => ({ ...s, prompts: s.prompts.filter((p) => p.id !== id) }));
      return removed;
    },
    [run, state.prompts],
  );

  const restorePrompt = useCallback(
    async (prompt: Prompt) => {
      await run((repo) => repo.restore(prompt));
      setState((s) => ({ ...s, prompts: upsert(s.prompts, prompt) }));
    },
    [run],
  );

  const importPrompts = useCallback(
    async (items: unknown[]) => {
      const result = mergeImport(state.prompts, items, {
        now: new Date(),
        newId: () => crypto.randomUUID(),
      });
      await run((repo) => repo.addMany(result.toAdd));
      setState((s) => ({ ...s, prompts: upsert(s.prompts, ...result.toAdd) }));
      return result;
    },
    [run, state.prompts],
  );

  const value = useMemo<PromptsContextValue>(
    () => ({
      ...state,
      addPrompt,
      updatePrompt,
      deletePrompt,
      restorePrompt,
      importPrompts,
      reload,
    }),
    [state, addPrompt, updatePrompt, deletePrompt, restorePrompt, importPrompts, reload],
  );

  return <PromptsContext.Provider value={value}>{children}</PromptsContext.Provider>;
}

export function usePrompts(): PromptsContextValue {
  const ctx = useContext(PromptsContext);
  if (!ctx) throw new Error("usePrompts must be used inside <PromptsProvider>");
  return ctx;
}
