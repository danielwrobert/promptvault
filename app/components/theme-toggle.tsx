"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { getPreferredDark, THEME_STORAGE_KEY } from "@/app/lib/theme";
import { MoonIcon, SunIcon } from "@/app/components/icons";
import { focusRing } from "@/app/components/styles";

// module-level so the references are stable
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // React Strict Mode's dev remount resets <html> attributes and wipes the
  // class the inline script set. In production this is a no-op.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", getPreferredDark());
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage unavailable (e.g. private mode) — theme just won't persist
    }
  }

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      aria-pressed={isDark}
      onClick={toggle}
      className={`flex items-center gap-[9px] p-1 cursor-pointer rounded-full ${focusRing}`}
    >
      <SunIcon className="stroke-muted" />
      <span className="flex h-[26px] w-[46px] items-center rounded-full border border-muted/35 bg-page p-[2px] transition-colors duration-200 dark:bg-hl-1">
        <span className="size-5 rounded-full bg-white shadow-knob transition-transform duration-200 dark:translate-x-5" />
      </span>
      <MoonIcon className="stroke-muted" />
    </button>
  );
}
