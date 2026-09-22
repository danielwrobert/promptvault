# Handoff Spec: PromptVault redesign

## Overview

Visual redesign of the PromptVault single-page prompt manager (currently a bare `app/page.tsx` with a form on the left and a saved-prompts list on the right). This pass adds a cohesive design system on top of the existing structure, plus a working light/dark theme toggle. No new features — same two panels, same fields (Title, Model, Content), same per-prompt data (model badge, tokens badge, date, star rating, notes with Add/Edit/Delete).

Two reference artifacts live alongside this doc:
- `reference.html` — a standalone, dependency-free HTML/CSS/JS page that implements the exact same look and interactions (theme toggle, add/delete prompt, star rating, notes CRUD). Open it directly in a browser to see and click through the design. Read its CSS for the literal token/spacing values, and its JS for the exact state transitions — then port both into React + Tailwind rather than copying markup 1:1.
- Live interactive prototype: https://claude.ai/artifact/9UedMtnBubYKBDNeJpdFBE (same design, built for review — not code to lift from).

Target stack (confirmed from the repo): Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. `app/page.tsx` is currently the create-next-app boilerplate; `app/globals.css` currently defines `--background`/`--foreground` via `@theme inline` and Geist fonts through `next/font`. This spec assumes that file is where the new tokens land.

## Design Tokens Used

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-background` | `#faf9fa` | `#383a59` | Card/surface fill |
| `--color-text` | `#2c2c2c` | `#f2f2f2` | Primary text |
| `--color-highlight-1` | `#9a63b4` | `#bd93f9` | Primary button, logo mark, focus ring, count badge, theme-toggle track (dark) |
| `--color-highlight-2` | `#a650a6` | `#ff79c6` | Model badge, delete-hover, note-delete action |
| `--color-highlight-3` | `#9a63b4` | `#50fa7b` | Tokens badge |
| `--color-highlight-4` | `#9a63b4` | `#ffb86c` | Star rating (filled) |
| `--color-highlight-5` | `#9a63b4` | `#8be9fd` | Notes accent (border + tint background) |
| `--color-shadow` | `#f0f0f0` | `#282a36` | Page background (sits behind the cards), input fill, dark-mode button text |
| `--color-shadow-light` | `#5e565e` | `#bcc2cd` | Secondary/muted text, dividers, borders (all used at ~30–45% opacity as borders) |

Notes on the light-mode palette: highlights 1, 3, 4 and 5 are the same purple by design (only highlight-2 differs) — this is correct, not a placeholder. Dark mode is the more differentiated palette (Dracula-style).

**Elevation pattern** (not part of the original token set, derived from it — reuse it, don't invent new hex values): page background = `--color-shadow`, card background = `--color-background`. In light mode that's a very light grey page under near-white cards; in dark mode it's a darker page under lighter-purple cards. This is what gives the cards visual lift in both themes using only the given tokens.

**Button text on highlight-1**: white in light mode, `--color-shadow` (dark) in dark mode — the light-mode purple is dark enough for white text, the dark-mode lavender is light enough that it needs dark text instead.

### Typography

| Token | Family | Weight(s) | Usage |
|---|---|---|---|
| `font-heading` | Ovo | 400 (only weight available) | `h1`/`h2`/`h3` — page title, card headings, prompt titles |
| `font-body` | Mulish | 400/500/600/700/800 | Everything else — labels, inputs, buttons, badges, body copy |
| `font-mono` | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` | — | Model identifier field/badge, token-count badge |

Implementation note: load Ovo and Mulish via `next/font/google` in `app/layout.tsx` (the same pattern already used for Geist), expose them as CSS variables, and swap them into the `@theme inline` block in `globals.css` in place of `--font-sans`. No `<link>` tags needed in the real app — that's only in `reference.html` because it has no build step.

### Dark mode wiring (Tailwind v4 specific)

The current `globals.css` only supports `prefers-color-scheme`, with no manual toggle. To add a real toggle button:
1. Add `@custom-variant dark (&:where(.dark, .dark *));` near the top of `globals.css` (Tailwind v4's replacement for the old `darkMode: 'class'` config option) so `dark:` utilities respond to a `.dark` class instead of only OS preference.
2. Toggle `document.documentElement.classList` on click; persist the choice to `localStorage`; on load, fall back to `window.matchMedia('(prefers-color-scheme: dark)')` when nothing is stored yet — `reference.html`'s `initTheme()`/`applyTheme()` functions show the exact logic.
3. Define both token sets as plain CSS custom properties (`:root { ... }` and `:root.dark { ... }`), same as `reference.html`, rather than only inside `@media (prefers-color-scheme: dark)`.

## Components

| Component | Variant | Notes |
|---|---|---|
| Logo mark | — | 46×46, `radius-13`, `background: highlight-1`, inline stroke sparkle icon (stroke = white light / `--color-shadow` dark) |
| Ghost button | Export, Import | Pill, 1px border (`shadow-light` @ ~35%), transparent fill; hover → border/text `highlight-1` |
| Theme toggle | — | Sun/moon icons flank a 46×26 pill track with a sliding 20px white knob; track background `--color-shadow` (off) / `highlight-1` (on) |
| Primary button | Save Prompt | Full-width, `highlight-1` fill, disabled state at 50% opacity + `not-allowed` cursor, disabled until all 3 fields are non-empty |
| Text input / textarea | default, monospace (Model field) | `--color-shadow` fill, 1.5px border, focus ring = `highlight-1` at ~25% |
| Prompt card | — | `--color-background` fill, `radius-18`, soft shadow (opacity scales up in dark mode) |
| Model badge | pill | Tinted `highlight-2` background (12–18% depending on theme), solid `highlight-2` text, monospace |
| Tokens badge | pill, outlined | Transparent fill, `highlight-3` border + text, monospace |
| Star rating | 5-star, clickable | Filled = solid `highlight-4` fill+stroke; empty = `shadow-light` stroke only, no fill |
| Notes block | view / add / edit | View: note text in a `highlight-5`-tinted box with a left accent border, or "No notes yet." in muted text. Edit: textarea + Save/Cancel/Delete Note actions |
| Count badge | — | Small pill next to "Saved Prompts", tinted `highlight-1` |
| Empty state | — | Dashed border box, centered muted copy: "No prompts saved yet. Add your first one!" |

## States and Interactions

| Element | State | Behavior |
|---|---|---|
| Theme toggle | Click | Toggles `.dark` on `<html>`, persists to `localStorage`, no page transition beyond the existing color/background transitions (~0.2–0.25s ease) |
| Save Prompt button | Disabled | Whenever Title, Model, or Content is empty/whitespace-only |
| Save Prompt button | Submit | Prepends a new card to the Saved Prompts list, clears the form, focus stays on the form for the next entry |
| Ghost buttons (Export/Import) | Hover | Border + text shift to `highlight-1` — behavior itself (actual export/import) is out of scope for this pass |
| Delete button | Hover | Border + text shift to `highlight-2` |
| Delete button | Click | Removes that card immediately (no confirm dialog in this version — flag if you want one) |
| Star | Click | Sets that prompt's rating to the clicked star's position (1–5); no "clear rating" affordance currently |
| Notes — no note yet | Click "Add" | Opens an inline textarea + Save Note / Cancel |
| Notes — has note | Click "Edit" | Opens the same textarea pre-filled, adds a Delete Note action alongside Save/Cancel |
| Notes textarea | Save | Trims whitespace; empty input clears the note (falls back to "No notes yet.") |
| Prompt list | Empty (all deleted) | Swaps to the dashed empty-state box |

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| Desktop (>900px) | Two-column grid: form column `minmax(300px, 380px)`, list column `1fr`, 28px gap, content capped at 1180px and centered |
| ≤900px | Single column — form stacks above the saved-prompts list (see `reference.html`'s `@media (max-width: 900px)` rule) |
| Header, any width | Logo/title block and the action cluster (Export/Import/toggle) `flex-wrap` onto a second row rather than compressing |

## Edge Cases

- **Long prompt title**: no explicit truncation spec'd beyond normal wrapping; keep to one line with ellipsis if it needs to stay tidy in the card header.
- **Long prompt content**: clamped to 2 lines with `-webkit-line-clamp` in the reference — carry this over so long prompts don't blow out card height.
- **Long note text**: not clamped — notes render in full inside the tinted box.
- **Zero saved prompts**: empty-state box, count badge reads `0`.
- **New prompt with no usage data yet**: tokens badge shows an em dash (`—`) and date reads "Just now" until real usage/telemetry exists.

## Accessibility Notes

- All interactive elements are real `<button>`, `<input>`, `<textarea>` with associated `<label for>` — no `div`/`span` click targets.
- Icon-only controls (theme toggle, per-star buttons, delete) carry `aria-label`.
- Theme toggle exposes `aria-pressed`.
- Focus states: inputs get a visible `highlight-1` ring on focus; carry equivalent `focus-visible` treatment onto the buttons when you port to Tailwind (`focus-visible:ring-2 focus-visible:ring-[--color-highlight-1]` or similar).
- Save button's disabled state uses the native `disabled` attribute, not just a visual dim — keep it that way so it's actually unfocusable/non-actionable, not just styled to look off.
