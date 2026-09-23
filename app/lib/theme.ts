export const THEME_STORAGE_KEY = "promptvault-theme";

/** Runs in <head> before first paint. Mirrors reference.html initTheme(). */
export const themeInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

/** Client-only. Stored choice wins; otherwise OS preference. */
export function getPreferredDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) return saved === "dark";
  } catch {
    // localStorage unavailable (e.g. private mode) — fall back to OS preference
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
