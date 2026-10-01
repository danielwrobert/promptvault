"use client";

import { useRef } from "react";
import { downloadJson } from "@/app/lib/download";
import { pluralize } from "@/app/lib/prompts/format";
import { buildExportFile, describeMergeResult } from "@/app/lib/prompts/import-export";
import { parseExportFile } from "@/app/lib/prompts/validate";
import { ExportIcon, ImportIcon } from "@/app/components/icons";
import { usePrompts } from "@/app/components/prompts-provider";
import { ghostButton } from "@/app/components/styles";
import { useToast } from "@/app/components/toast";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const NOT_AN_EXPORT = "That file isn't a PromptVault export.";

/** yyyy-mm-dd in the viewer's local time zone. */
function localDateStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function LibraryActions() {
  const { status, prompts, importPrompts } = usePrompts();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const now = new Date();
    downloadJson(buildExportFile(prompts, now), `promptvault-export-${localDateStamp(now)}.json`);
    toast.show({ message: `Exported ${pluralize(prompts.length, "prompt")}.` });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset right away so choosing the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      toast.show({ message: "That file is too large to import (5 MB max).", tone: "error" });
      return;
    }

    let parsed: { items: unknown[] } | null = null;
    try {
      parsed = parseExportFile(JSON.parse(await file.text()));
    } catch {
      // unreadable or not JSON: handled below
    }
    if (!parsed) {
      toast.show({ message: NOT_AN_EXPORT, tone: "error" });
      return;
    }

    try {
      const result = await importPrompts(parsed.items);
      toast.show({ message: describeMergeResult(result) });
    } catch {
      // the provider has already shown an error toast
    }
  }

  return (
    <>
      <button
        type="button"
        title="Export your prompt library"
        disabled={status !== "ready" || prompts.length === 0}
        onClick={handleExport}
        className={`${ghostButton} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-muted/35 disabled:hover:text-ink`}
      >
        <ExportIcon />
        Export
      </button>
      <button
        type="button"
        title="Import a prompt library"
        disabled={status !== "ready"}
        onClick={() => inputRef.current?.click()}
        className={`${ghostButton} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-muted/35 disabled:hover:text-ink`}
      >
        <ImportIcon />
        Import
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFile}
      />
    </>
  );
}
