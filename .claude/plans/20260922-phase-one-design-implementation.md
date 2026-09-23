# PromptVault redesign: Phase 1 (visual design + in-memory interactions)

## Context

`app/page.tsx` still holds the create-next-app boilerplate. A finished design exists in `design/promptvault-redesign/`:
- `HANDOFF.md` is the spec: tokens, components, states, responsive rules, and a11y.
- `reference.html` is a standalone HTML/CSS/JS page. It is the exact visual and behavioral reference.

This phase implements that design in the Next.js app as idiomatic React + TypeScript + Tailwind v4, not as a markup port. It covers the look, a working light/dark toggle, and the reference's in-memory interactions:
- add a prompt
- delete a prompt
- star rating
- notes add/edit/delete

Persistence, Export/Import behavior, and real token/date data belong to **Phase 2**. Don't build them now. Keep the data model clean so Phase 2 can drop in.

**Stack:** Next.js 16.3.6 (App Router), React 19.3, Tailwind 4.3.2 (via `@tailwindcss/postcss`), and TypeScript with strict mode on. Path alias `@/*` points to the repo root.

## Decisions already made (don't re-ask)

- **Split into components.** `app/page.tsx` is a thin Server Component. UI goes in `app/components/`, and types, seed data and theme helpers go in `app/lib/`.
- **`app/layout.tsx` also changes.** It needs the fonts, the metadata and the no-flash theme script, as the handoff requires.
- **Seed data:** include the reference's two sample prompts (reference.html:268–293) as the initial state.
- **Long titles** wrap normally, as in the reference: no truncation, just `break-words`.
- **Delete** has no confirm dialog.
- **Export/Import** are visual only, with no `onClick`.
- **Color mixing:** Tailwind's opacity modifiers compile to `color-mix(in oklab, …)`, while the reference uses `srgb`. The tiny difference is **accepted**. Don't chase it with arbitrary values.
- **Mobile padding:** keep the reference's `32px` horizontal page padding at all widths.

## Step 0: Read before coding (required by AGENTS.md)

This Next.js version differs from training data. Read these first:
- `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`, especially the "Themes" and "Re-applying attributes in development" sections. The theme approach below comes from it.
- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`

Then read `design/promptvault-redesign/HANDOFF.md` and `reference.html` in full.

## Token layer (the most important part, so read carefully)

The raw CSS custom properties keep the **exact handoff names**, so they can be cross-checked one-to-one against reference.html:11–33. Tailwind utilities use **alias names**, because several handoff names collide with Tailwind utilities:
- `text-shadow-*` is a real v4 utility.
- `shadow-*` is box-shadow.
- `text-text` is confusing.

| Handoff token (raw CSS var) | Tailwind color name | Example utilities |
|---|---|---|
| `--color-background` (card surface) | `surface` | `bg-surface` |
| `--color-text` | `ink` | `text-ink` |
| `--color-shadow` (page bg, input fill, dark-mode button text) | `page` | `bg-page`, `dark:text-page`, `dark:stroke-page` |
| `--color-shadow-light` (muted text, borders) | `muted` | `text-muted`, `border-muted/35` |
| `--color-highlight-1` … `-5` | `hl-1` … `hl-5` | `bg-hl-1`, `text-hl-2`, `border-hl-3/55`, `fill-hl-4`, `bg-hl-5/8` |

**Forbidden:**
- the utilities `text-shadow*`, `shadow-shadow`, `bg-background` and `text-text`
- any hex colors in components (the one exception is `bg-white`/`stroke-white`/`text-white`, which the reference uses literally)
- self-referential `@theme` entries, such as `--color-hl-1: var(--color-hl-1)`

### `app/globals.css`: replace the whole file (don't merge with the boilerplate)

The boilerplate's `@theme inline { --color-background: var(--background) }` would conflict with the raw token of the same name, so the whole file goes. Write this:

```css
@import "tailwindcss";

/* Tailwind v4 replacement for darkMode: 'class' — dark: utilities follow .dark on <html> */
@custom-variant dark (&:where(.dark, .dark *));

/* Design tokens (names match design/promptvault-redesign/HANDOFF.md) */
:root {
  --color-background: #faf9fa;
  --color-text: #2c2c2c;
  --color-highlight-1: #9a63b4;
  --color-highlight-2: #a650a6;
  --color-highlight-3: #9a63b4;
  --color-highlight-4: #9a63b4;
  --color-highlight-5: #9a63b4;
  --color-shadow: #f0f0f0;
  --color-shadow-light: #5e565e;
}

:root.dark {
  --color-background: #383a59;
  --color-text: #f2f2f2;
  --color-highlight-1: #bd93f9;
  --color-highlight-2: #ff79c6;
  --color-highlight-3: #50fa7b;
  --color-highlight-4: #ffb86c;
  --color-highlight-5: #8be9fd;
  --color-shadow: #282a36;
  --color-shadow-light: #bcc2cd;
}

@theme inline {
  --color-surface: var(--color-background);
  --color-ink: var(--color-text);
  --color-page: var(--color-shadow);
  --color-muted: var(--color-shadow-light);
  --color-hl-1: var(--color-highlight-1);
  --color-hl-2: var(--color-highlight-2);
  --color-hl-3: var(--color-highlight-3);
  --color-hl-4: var(--color-highlight-4);
  --color-hl-5: var(--color-highlight-5);

  --font-sans: var(--font-mulish), sans-serif;
  --font-body: var(--font-mulish), sans-serif;
  --font-heading: var(--font-ovo), serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

@theme {
  --radius-field: 10px;  /* inputs, primary button, note box */
  --radius-logo: 13px;
  --radius-card: 18px;   /* cards, empty state */

  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.05), 0 16px 32px -20px rgb(0 0 0 / 0.14);
  --shadow-card-dark: 0 1px 2px rgb(0 0 0 / 0.35), 0 16px 32px -20px rgb(0 0 0 / 0.55);
  --shadow-knob: 0 1px 3px rgb(0 0 0 / 0.35);
}

@layer base {
  /* reference.html never sets line-height; Tailwind preflight sets 1.5 — undo it */
  html { line-height: normal; }

  h1, h2, h3 {
    font-family: var(--font-ovo), serif;
    font-weight: 400;
  }
}
```

This gives you:
- radius utilities `rounded-field`, `rounded-logo` and `rounded-card`
- shadow utilities `shadow-card`, `dark:shadow-card-dark` and `shadow-knob`
- font utilities `font-body`, `font-heading` and `font-mono`

**Font sizes:** always use pixel arbitrary values that match the reference, such as `text-[14px]`, `text-[14.5px]`, `text-[12px]`, `text-[12.5px]` and `text-[13.5px]`. Don't use named sizes like `text-sm` or `text-xs`, because they also set a line-height the reference doesn't have. Use `leading-*` only where the reference sets a `line-height`. Letter-spacing also uses arbitrary values, such as `tracking-[.08em]`.

## Tailwind v4 preflight traps (apply everywhere)

- **Cursor:** buttons default to `cursor: default`. **Every** `<button>` gets `cursor-pointer`. The Save button also gets `disabled:cursor-not-allowed disabled:opacity-50`.
- **Border color:** `border` defaults to `currentColor`. Always pair it with a color, such as `border border-muted/35`.
- **Ring width:** `ring` is 1px in v4. For the input focus state (reference.html:100), use `focus:outline-none focus:border-hl-1 focus:ring-3 focus:ring-hl-1/25`. For the 1.5px border, use `border-[1.5px]`.
- **Headings:** preflight resets them, which the `@layer base` rule above handles. The prompt title is an `h3` with `font-extrabold` in Ovo. Ovo only ships 400, so the bold is synthesized, exactly as in the reference. **Don't** "fix" it by switching the title to Mulish.
- **Button focus:** give every button a visible `focus-visible` style using one shared constant: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hl-1`.
- **Class order doesn't override:** when two utilities set the same property, Tailwind decides the winner by stylesheet order, not by the order in the class string. **Never** append a utility that overrides one already inside a shared constant, such as adding `text-sm` to a string that already has `text-[14.5px]`. Leave the conflicting property out of the shared constant and add it at each use site.
- **Line height:** `html { line-height: normal }` in the base layer matches the reference. Don't add `leading-*` except where the plan says to.

## Files to create or modify

```
app/globals.css                 (replace — see above)
app/layout.tsx                  (modify)
app/page.tsx                    (replace)
app/lib/theme.ts                (new — storage key, init script, preference reader)
app/lib/prompts.ts              (new — Prompt type + seed data)
app/components/styles.ts        (new — shared class-string constants)
app/components/icons.tsx        (new — inline SVG icons)
app/components/header.tsx       (new — no "use client")
app/components/theme-toggle.tsx (new — "use client")
app/components/prompt-vault.tsx (new — "use client", owns prompts state)
app/components/add-prompt-form.tsx (new)
app/components/prompt-card.tsx  (new)
app/components/star-rating.tsx  (new)
app/components/prompt-notes.tsx (new)
```

Conventions:
- kebab-case file names
- PascalCase named exports (`export function PromptCard`), no default exports except `page.tsx` and `layout.tsx`
- double quotes and semicolons, matching the existing code

## Step 1: `app/lib/theme.ts` (no `"use client"`, since the layout imports it)

```ts
export const THEME_STORAGE_KEY = "promptvault-theme";

/** Runs in <head> before first paint. Mirrors reference.html initTheme(). */
export const themeInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

/** Client-only. Stored choice wins; otherwise OS preference. */
export function getPreferredDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) return saved === "dark";
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
```

## Step 2: `app/layout.tsx`

- Remove Geist/Geist_Mono. Import `Ovo` and `Mulish` from `next/font/google`:
  - `Ovo({ weight: "400", subsets: ["latin"], variable: "--font-ovo" })`. Ovo isn't a variable font, so `weight` is required.
  - `Mulish({ subsets: ["latin"], variable: "--font-mulish" })`. Mulish is a variable font, so no weight is needed.
- `metadata`: `title: "PromptVault"`, `description: "Your personal library of AI prompts"`.
- `<html lang="en" className={`${ovo.variable} ${mulish.variable} h-full antialiased`} suppressHydrationWarning>`
- Add `<head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>`, importing `themeInitScript` from `@/app/lib/theme`.
- `<body className="min-h-full bg-page font-body text-ink transition-colors duration-250">{children}</body>`. The transition mirrors reference.html:41.

## Step 3: `app/lib/prompts.ts`

```ts
export type Prompt = {
  id: string;
  title: string;
  content: string;
  model: string;
  tokens: string;   // display string for now, e.g. "180–420 (medium)" or "—"
  date: string;     // display string for now, e.g. "Sep 18, 9:47 AM" or "Just now"
  rating: number;   // 0–5
  note: string | null;
};

export const SEED_PROMPTS: Prompt[] = [ /* the two prompts from reference.html:269–292, ids "seed-1" / "seed-2" */ ];
```

- `Prompt` is **pure data**. UI state such as note edit mode and the draft text does **not** go on it.
- Copy the seed text exactly, including the en dashes in the token strings.
- **Hydration safety:** the seed data holds literal strings only. Don't call `Date`, `toLocale*` or `crypto.randomUUID()` in module scope, initial state or render.

## Step 4: `app/components/styles.ts` and `icons.tsx`

**`styles.ts`** exports class-string constants reused in several places, so utilities aren't duplicated:
- `focusRing`: the `focus-visible` outline string from the traps section.
- `card`: `rounded-card bg-surface p-[30px] shadow-card dark:shadow-card-dark` (reference.html:85–89)
- `field`: `block w-full rounded-field border-[1.5px] border-muted/35 bg-page px-[13px] py-[11px] text-ink focus:outline-none focus:border-hl-1 focus:ring-3 focus:ring-hl-1/25` (reference.html:95–102). It deliberately has **no font size**. Each use adds one:
  - Title input: `text-[14.5px]`
  - Content textarea and note textarea: `text-[14.5px] resize-y leading-[1.5]`
  - Model input: `font-mono text-[14px]`
- `label`: `mb-2 block text-[11px] font-extrabold tracking-[.08em] text-muted` (reference.html:93). No `uppercase`: the reference renders "Title", "Model" and "Content" as written.
- `pillSmall`: the base for the note buttons (reference.html:153–175): `rounded-full text-[11.5px] font-extrabold uppercase tracking-[.03em] cursor-pointer` plus `focusRing`.

**`icons.tsx`** exports small components that take `className` and pass it to `<svg>`. Copy the paths and viewBoxes verbatim from the reference:
- `SparkleIcon` (line 191, 24px, strokeWidth 2)
- `ExportIcon` (line 200) and `ImportIcon` (line 204), both 14px with `stroke="currentColor"`
- `SunIcon` (line 209) and `MoonIcon` (line 211), both 16px
- `StarIcon` (line 304, 17px, strokeWidth 1.4)

Set `aria-hidden="true"` on every icon. Use camelCase SVG attributes (`strokeWidth`, `strokeLinecap`, `strokeLinejoin`).

## Step 5: `app/components/theme-toggle.tsx` (`"use client"`)

Mirrors reference.html:73–80 (styles) and 248–264 (logic).

Theme state lives on the DOM (`<html class="dark">`), not in React state. React only **reads** it for `aria-pressed`, and all the visuals use `dark:` utilities. That avoids any hydration mismatch.

```tsx
// module-level so the references are stable
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;
```

Inside `ThemeToggle`:
1. `const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);`
2. `useLayoutEffect(() => { document.documentElement.classList.toggle("dark", getPreferredDark()); }, []);` Add a comment explaining why: React Strict Mode's dev remount resets `<html>` attributes and wipes the class the inline script set. In production this is a no-op. (See the "Re-applying attributes in development" section of the Next guide.)
3. `toggle()`: `const next = !isDark;` then `classList.toggle("dark", next)`, then `localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light")` wrapped in try/catch.

Markup is a `<button type="button" aria-label="Toggle dark mode" aria-pressed={isDark}>` with `flex items-center gap-[9px] p-1 cursor-pointer rounded-full` and `focusRing`. It contains, in order:
- `SunIcon` with `stroke-muted`
- the track `<span>`: `flex h-[26px] w-[46px] items-center rounded-full border border-muted/35 bg-page p-[2px] transition-colors duration-200 dark:bg-hl-1`
- the knob `<span>` inside the track: `size-5 rounded-full bg-white shadow-knob transition-transform duration-200 dark:translate-x-5`. The travel is 46 − 2 (border) − 4 (padding) − 20 = 20px, which equals `translate-x-5`.
- `MoonIcon` with `stroke-muted`

## Step 6: `app/components/header.tsx` (no directive; renders the client `ThemeToggle`)

Mirrors reference.html:47–71 and 188–214. The `<header>` gets `mb-9 flex flex-wrap items-start justify-between gap-5 border-b border-muted/35 pb-7`. It contains two groups.

**Brand group:** `flex items-center gap-4`.
- Logo: `flex size-[46px] shrink-0 items-center justify-center rounded-logo bg-hl-1`, holding `<SparkleIcon className="stroke-white dark:stroke-page" />`.
- Text: `<h1 className="text-[30px] tracking-[-0.01em]">PromptVault</h1>` and `<p className="mt-1.5 text-[14px] text-muted">Your personal library of AI prompts</p>`.

**Actions group:** `flex flex-wrap items-center gap-3.5`.
- Two ghost buttons, Export and Import. Each has a `title` attribute copied from the reference, and these classes plus `focusRing`: `flex items-center gap-[7px] rounded-full border border-muted/35 px-4 py-[9px] text-[13px] font-bold uppercase tracking-[.04em] text-ink cursor-pointer transition-colors hover:border-hl-1 hover:text-hl-1`. They have no handlers.
- Divider: `<div aria-hidden="true" className="h-[26px] w-px bg-muted/35" />`
- `<ThemeToggle />`

## Step 7: `app/page.tsx` (Server Component, replace boilerplate)

```tsx
import { Header } from "@/app/components/header";
import { PromptVault } from "@/app/components/prompt-vault";

export default function Home() {
  return (
    <div className="mx-auto max-w-[1180px] px-8 pt-14 pb-24">
      <Header />
      <PromptVault />
    </div>
  );
}
```

The wrapper mirrors reference.html:45. Remove the `next/image` import.

## Step 8: `app/components/prompt-vault.tsx` (`"use client"`)

This component owns `const [prompts, setPrompts] = useState<Prompt[]>(SEED_PROMPTS)` and passes callbacks down. All updates are immutable, using `map`/`filter` and never mutating in place:
- `addPrompt({ title, model, content })` **prepends** `{ id: crypto.randomUUID(), …, tokens: "—", date: "Just now", rating: 0, note: null }`. Generating the id **inside the handler** is fine, because it never runs during render.
- `deletePrompt(id)`
- `ratePrompt(id, rating)`
- `setNote(id, note: string | null)`

**Layout** (reference.html:82–83, 216–244):
- The grid is `grid grid-cols-1 items-start gap-7 min-[901px]:grid-cols-[minmax(300px,380px)_1fr]`. It's single-column at 900px and below, per the handoff.
- Left column: `<AddPromptForm onAdd={addPrompt} />`.
- Right column is a `<section aria-labelledby=…>` containing:
  - List header (`mb-5 flex items-center justify-between`), with:
    - `<h2 className="text-[24px]">Saved Prompts</h2>`. This h2 is not inside a card, so the reference's `.pv-card h2 { 21px }` rule doesn't apply and it renders at the browser default of 24px.
    - the count badge `<span>` (reference.html:113–118): `flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-hl-1/14 px-2 text-[13px] font-extrabold text-hl-1 dark:bg-hl-1/20`, showing `{prompts.length}`.
  - The body, which depends on the count:
    - If `prompts.length === 0`, render the empty state (reference.html:177–180): `rounded-card border-[1.5px] border-dashed border-muted/35 px-6 py-12 text-center text-[14.5px] text-muted`, with the copy "No prompts saved yet. Add your first one!"
    - Otherwise render `<div className="flex flex-col gap-[18px]">` mapping to `<PromptCard key={p.id} prompt={p} onDelete onRate onNoteChange />`.

## Step 9: `app/components/add-prompt-form.tsx`

Mirrors reference.html:93–110, 217–234 and 410–443. It is a `<section className={card}>` containing `<h2 className="mb-[22px] text-[21px]">Add Prompt</h2>` and a `<form onSubmit={handleSubmit} noValidate>`.

**State:**
- Controlled `title`, `model` and `content` via `useState("")`.
- `const canSave = [title, model, content].every(v => v.trim() !== "")`.

**Fields** follow this pattern, three times. Use `useId()` or fixed ids such as `pv-title` for the `label`/`htmlFor` pairs.
- `<label className={label} htmlFor=…>Title</label>`
- the input or textarea with `className={field}` (plus the variants noted in Step 4)
- a hint: `<p className="mt-2 mb-5 text-[12.5px] text-muted">…</p>`

| Field | Element | Attributes | Hint text |
|---|---|---|---|
| Title | `input type="text"` | `maxLength={120}`, placeholder `e.g. Blog Idea Generator` | "Required. Max 120 characters." |
| Model | `input type="text"` with mono font | `maxLength={100}`, placeholder `e.g. gpt-4o-mini` | "Required. Model identifier (max 100 chars)." |
| Content | `textarea` | `rows={7}`, placeholder `Enter the full prompt here...` | "Required." |

**Submit button:** `<button type="submit" disabled={!canSave}>Save Prompt</button>` with `focusRing` and `w-full rounded-field bg-hl-1 p-[13px] text-[14.5px] font-extrabold tracking-[.02em] text-white dark:text-page cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`. Use the native `disabled` attribute (a11y requirement).

**`handleSubmit`** does the following:
1. Call `e.preventDefault()`.
2. Return early if `!canSave`.
3. Call `onAdd` with the trimmed values.
4. Clear all three fields.
5. Refocus the Title input via a `useRef<HTMLInputElement>`. The handoff says "focus stays on the form for the next entry". Without this, focus is lost when the button becomes disabled.

Use a plain `onSubmit`. Don't use React 19 form `action`s or server actions in this phase.

## Step 10: `app/components/prompt-card.tsx`

Mirrors reference.html:121–144 and 334–353. It is an `<article className={card}>` containing three parts.

**1. Top row** (`flex items-start justify-between gap-4`):
- `<div className="min-w-0">` holding:
  - `<h3 className="mb-1.5 text-[17px] font-extrabold break-words">{title}</h3>`
  - `<p className="m-0 max-w-[60ch] line-clamp-2 text-[14px] leading-[1.5] text-muted">{content}</p>`. `line-clamp-2` is the handoff's 2-line clamp.
- The delete button: `<button type="button" aria-label={`Delete ${title}`}>Delete</button>` with `focusRing` and `shrink-0 rounded-full border border-muted/45 px-3.5 py-[7px] text-[12px] font-extrabold uppercase tracking-[.04em] text-muted cursor-pointer transition-colors hover:border-hl-2 hover:text-hl-2`.

**2. Badges row** (`mt-4 flex flex-wrap items-center gap-2.5`):
- Model badge: `rounded-full bg-hl-2/12 px-3 py-[5px] font-mono text-[12.5px] font-semibold text-hl-2 dark:bg-hl-2/18`
- Tokens badge: `rounded-full border border-hl-3/55 px-3 py-[5px] font-mono text-[12.5px] font-semibold text-hl-3`. Its text is `Tokens: {tokens}`.
- Date: `text-[13px] text-muted`

**3. The two child components:**
- `<StarRating value={rating} onChange={r => onRate(id, r)} />`
- `<PromptNotes note={note} onChange={n => onNoteChange(id, n)} />`

## Step 11: `app/components/star-rating.tsx`

Mirrors reference.html:146–148, 301–311.
- Wrapper: `<div role="group" aria-label="Rating" className="mt-3.5 flex items-center gap-1">`.
- It holds five `<button type="button" aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}>`, each with `focusRing`, `cursor-pointer p-0.5 leading-none rounded`, and `onClick={() => onChange(n)}`.
- Star colors:
  - filled (`n <= value`): `<StarIcon className="fill-hl-4 stroke-hl-4" />`
  - empty: `<StarIcon className="fill-none stroke-muted" />`
- Clicking a star sets the rating to that number. There is no "clear rating" behavior.

## Step 12: `app/components/prompt-notes.tsx`

Mirrors reference.html:150–175, 313–332 and 386–399.

**State:** the edit state is **local UI state here**, not on `Prompt`:
- `const [editing, setEditing] = useState(false)`
- `const [draft, setDraft] = useState("")`

**Container:** `mt-[18px] border-t border-muted/35 pt-[18px]`.

**Head row** (`mb-2.5 flex items-center justify-between`):
- `<span className="text-[11px] font-extrabold tracking-[.08em] text-muted">Notes</span>` (no `uppercase`, same as the form labels)
- When **not** editing: a button labeled `note ? "Edit" : "Add"`, using `pillSmall` + `border border-hl-1 px-3 py-[5px] text-hl-1`. Its onClick runs `setDraft(note ?? ""); setEditing(true)`.

**Body**, one of three states:
- **Editing:**
  - `<textarea className={`${field} text-[14.5px] resize-y leading-[1.5] mb-2.5`} rows={3} placeholder="Add a note about this prompt..." aria-label="Note" autoFocus value={draft} onChange=… />`
  - Below it, `<div className="flex gap-2">` with the buttons, each using `pillSmall` + `px-3.5 py-[7px]`:
    - **Save Note:** `border-0 bg-hl-1 text-white dark:text-page`. Runs `onChange(draft.trim() || null)`, then sets editing to false.
    - **Cancel:** `border border-muted/35 text-ink`. Sets editing to false and clears the draft.
    - **Delete Note** (render only when `note` is truthy): `border border-hl-2/50 text-hl-2`. Runs `onChange(null)` and sets editing to false.
- **Has a note:** `<div className="rounded-r-field border-l-[3px] border-hl-5 bg-hl-5/8 px-3.5 py-3 text-[13.5px] leading-[1.55] text-ink whitespace-pre-wrap dark:bg-hl-5/14">{note}</div>`. Notes are not clamped.
- **No note:** `<p className="m-0 text-[13.5px] text-muted">No notes yet.</p>`

## Step 13: Verify

1. **Lint and build:** run `npm run lint` and `npm run build`. Both must pass with no TypeScript or ESLint errors. React Compiler/hooks lint rules are active, so fix what they flag instead of disabling them.
2. **Dev server:** in `npm run dev`, check the browser console for **no hydration warnings** in light mode, in dark mode, and after toggling.
3. **No-flash check:** run this against **`npm run build && npm start`**, not dev.
   - Toggle to dark, then hard-reload. There should be no light flash.
   - Clear localStorage and emulate `prefers-color-scheme: dark`, using the browser pane's `resize_window` `colorScheme` or Playwright `browser_emulate_media`. On reload the page should load dark with no flash.
   - With localStorage cleared under a light OS preference, the page should load light.
4. **Visual parity:** open `design/promptvault-redesign/reference.html` next to `http://localhost:3000`. Screenshot both at 1280px and 375px wide, in both themes, and compare:
   - the colors of the page, cards, badges, stars and note box
   - the fonts (Ovo headings, Mulish body, mono badges)
   - spacing, radii and shadows
   - the toggle knob position
   - at 375px, the form stacks above the list and the header actions wrap onto a second row
5. **Interaction checklist** (from the HANDOFF "States and Interactions" table):
   - [ ] Save is disabled while any field is empty **or whitespace-only**, and Tab skips it while disabled.
   - [ ] Saving prepends a card showing Tokens `—`, "Just now" and 0 stars, clears the form, and moves focus to Title.
   - [ ] The count badge updates as prompts are added and deleted.
   - [ ] Delete removes the card immediately. Deleting all cards shows the dashed empty state, with the count at `0`.
   - [ ] Clicking star N sets the rating to N.
   - [ ] Notes: Add opens an empty editor with Save and Cancel only. Edit opens a prefilled editor that also shows Delete Note.
   - [ ] Notes: saving whitespace-only text clears the note ("No notes yet."). Cancel discards the draft. Delete Note clears the note.
   - [ ] The theme toggle flips `aria-pressed` and persists across reload.
   - [ ] Ghost, Delete and Star buttons show their hover colors, and every button shows a visible focus ring on keyboard focus.
   - [ ] A long prompt's content clamps to 2 lines, and a long title wraps.

## Out of scope (Phase 2)

- persistence (localStorage or a backend)
- Export/Import behavior
- real token estimates and timestamps
- a clear-rating behavior
- a delete confirmation
