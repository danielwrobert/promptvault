"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/app/components/icons";
import { linkButton } from "@/app/components/styles";
import { useToast } from "@/app/components/toast";

const CLAMPED = "m-0 max-w-[60ch] line-clamp-2 text-[14px] leading-[1.5] text-muted";
const EXPANDED = "m-0 max-w-[60ch] whitespace-pre-wrap break-words text-[14px] leading-[1.5] text-muted";

export function PromptContent({ content }: { content: string }) {
  const toast = useToast();
  const contentId = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Show more / Show less only when the 2-line clamp actually cuts the text off.
  // ResizeObserver fires once on observe(), so the effect body never calls setState itself.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      // While expanded, keep the toggle visible so the text can be collapsed again.
      if (!expanded) setOverflowing(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, content]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      toast.show({ message: "Couldn't copy. Select the text and copy it manually.", tone: "error" });
      setExpanded(true);
      return;
    }
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-1.5">
      <p ref={textRef} id={contentId} className={expanded ? EXPANDED : CLAMPED}>
        {content}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {(overflowing || expanded) && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded((v) => !v)}
            className={linkButton}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
        <button type="button" onClick={copy} className={linkButton}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {/* Both labels share one grid cell so swapping them doesn't shift the layout. */}
          <span className="inline-grid">
            <span className={`col-start-1 row-start-1 ${copied ? "invisible" : ""}`}>Copy prompt</span>
            <span className={`col-start-1 row-start-1 ${copied ? "" : "invisible"}`}>Copied</span>
          </span>
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Prompt copied to clipboard" : ""}
        </span>
      </div>
    </div>
  );
}
