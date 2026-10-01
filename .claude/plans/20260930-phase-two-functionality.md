# PromptVault Phase 2: functionality (localStorage persistence)

## Context

Phase 1 (merged in PR #1) implemented the design with in-memory state only. On reload the app resets to two hardcoded sample prompts, Export and Import do nothing, and tokens and dates are fake display strings.

Phase 2 makes the app real, for a single user in one browser, stored in **localStorage**. The longer-term goal is to deploy on Vercel with login and store prompts in **Supabase** (a later phase, called Phase 3 below).

So the rule for this phase is: **all storage goes through one async repository interface.** Phase 3 then replaces a single file (the localStorage implementation) with a Supabase one, and the UI doesn't change.

**Stack:** Next.js 16.3.6 (App Router), React 19.3, Tailwind 4.3.2, and strict TypeScript. The branch `add/phase-two-functionality` already exists and is checked out.

## Decisions already made (don't re-ask)

| Topic | Decision |
|---|---|
| Storage | localStorage now, behind an async `PromptRepository` interface. Supabase comes in Phase 3. |
| Tokens | **Removed entirely**: from the type, the card badge, and everywhere else. |
| Dates | Stored as ISO timestamps (`createdAt`, `updatedAt`). The card shows `createdAt`, formatted in the viewer's locale. |
| Export | A JSON file download. |
| Import | JSON, **merged** into the library. Duplicates are **skipped**. |
| First run | **Starts empty.** The sample prompts are removed from the app and kept only as a test fixture file. |
| Delete | Takes effect immediately, then shows an **Undo** toast for 6 seconds. There is no confirm dialog. |
| Clear rating | Clicking the star that matches the current rating clears the rating to 0. |
| Edit prompt | Inline edit mode inside the card, for title, model and content. |
| Reading full prompts | A "Show more / Show less" toggle, shown only when the content is actually cut off by the 2-line clamp. Expanded content keeps its line breaks. |
| Copy prompt | A "Copy prompt" button on every card that copies the full content to the clipboard, with "Copied" feedback shown on the button itself. |
| Tests | Add **Vitest** for the pure logic: validation, import merge, and the repository. There are no UI tests in this phase. |

Out of scope: auth, Supabase, deployment, search/filter/sort controls, and tags.

## Step 0: Read before coding (AGENTS.md requires this)

This Next.js version differs from training data. Read:
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`
- `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`, the "Syncing with React state" section

Then read every file in `app/` to learn the Phase 1 conventions:
- the shared class constants in `app/components/styles.ts`: `card`, `field`, `label`, `pillSmall`, `focusRing`
- the token aliases in `app/globals.css`: `surface`, `ink`, `page`, `muted`, `hl-1`…`hl-5`
- the rules in `.claude/plans/20260922-phase-one-design-implementation.md`, section "Tailwind v4 preflight traps". **All of them still apply**:
  - pixel font sizes, never `text-sm` or `text-xs`
  - `cursor-pointer` on every button
  - `border` always paired with a color
  - never override a property that is already inside a shared constant
  - no hex colors

**Lint rules that will bite** (`eslint-plugin-react-hooks` 7, with `recommended` rules as errors):
- `set-state-in-effect`: never call `setState` synchronously in an effect body. Setting state inside a promise callback (`.then(...)`) is fine.
- `purity`: no `Date.now()`, `new Date()`, `Math.random()` or `crypto.randomUUID()` during render. They are allowed in event handlers, in effects, and in the repository.
- `refs`: don't read `ref.current` during render.

## Target file layout

```
app/lib/prompts/types.ts                    (new)  Prompt, PromptInput, limits
app/lib/prompts/validate.ts                 (new)  parse unknown → Prompt, parse export files
app/lib/prompts/import-export.ts            (new)  buildExportFile, mergeImport (pure)
app/lib/prompts/repository.ts               (new)  PromptRepository interface
app/lib/prompts/local-storage-repository.ts (new)  localStorage implementation
app/lib/prompts/format.ts                   (new)  formatPromptDate
app/lib/prompts.ts                          (DELETE — replaced by the folder above)
app/lib/download.ts                         (new)  downloadJson helper (browser only)

app/components/prompts-provider.tsx         (new, "use client")  context + usePrompts()
app/components/toast.tsx                    (new, "use client")  ToastProvider + useToast()
app/components/library-actions.tsx          (new, "use client")  Export/Import buttons
app/components/prompt-fields.tsx            (new, "use client")  shared Title/Model/Content fields
app/components/prompt-editor.tsx            (new, "use client")  inline edit mode for a card
app/components/prompt-content.tsx           (new, "use client")  clamped content + Show more + Copy
app/components/icons.tsx                    (modify) add CopyIcon, CheckIcon
app/components/header.tsx                   (modify) use <LibraryActions />
app/components/prompt-vault.tsx             (modify) consume usePrompts(), loading state
app/components/add-prompt-form.tsx          (modify) use <PromptFields />, async add
app/components/prompt-card.tsx              (modify) Edit button, edit mode, no tokens, real date
app/components/star-rating.tsx              (modify) clear-by-reclick
app/components/styles.ts                    (modify) add shared pill-button constants
app/page.tsx                                (modify) wrap in providers

fixtures/sample-prompts.json                (new)  the two old seed prompts, in export format
vitest.config.mts, package.json             (modify) test setup
app/lib/prompts/*.test.ts                   (new)  unit tests
```

## Step 1: Types (`app/lib/prompts/types.ts`)

```ts
export const TITLE_MAX = 120;
export const MODEL_MAX = 100;
export const CONTENT_MAX = 50_000;
export const NOTE_MAX = 10_000;

export type Prompt = {
  id: string;          // UUID
  title: string;       // 1..TITLE_MAX, trimmed
  model: string;       // 1..MODEL_MAX, trimmed
  content: string;     // 1..CONTENT_MAX, trimmed
  rating: number;      // integer 0–5; 0 = unrated
  note: string | null; // trimmed, null when empty
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
};

/** Fields a user types in the add/edit forms. */
export type PromptInput = Pick<Prompt, "title" | "model" | "content">;

/** Fields that can change after creation. */
export type PromptPatch = Partial<Pick<Prompt, "title" | "model" | "content" | "rating" | "note">>;
```

`Prompt` stays pure data, as in Phase 1. For Phase 3, these camelCase fields map to snake_case Supabase columns inside the Supabase repository. The rest of the app never sees column names.

Delete `app/lib/prompts.ts` and update every import. `SEED_PROMPTS` and the `tokens` field go away completely. Search for `tokens` and `SEED_PROMPTS` to confirm nothing still references them.

## Step 2: Validation (`app/lib/prompts/validate.ts`)

Write it by hand. **Don't add zod or any other dependency.** Everything here is a pure function with no browser APIs.

- `normalizeInput(input: PromptInput): PromptInput`: trims all three fields.
- `isValidInput(input: PromptInput): boolean`: after trimming, every field is non-empty and within its max length. The add and edit forms use this to enable their Save buttons.
- `parsePrompt(value: unknown): Prompt | null`: accepts an object with the `Prompt` shape and returns a normalized `Prompt`, or `null` if it's invalid. The rules:
  - **Required:** `title`, `model` and `content` must be non-empty strings within their limits after trimming.
  - **`id`:** a non-empty string. If it's missing, return an object **without** an id. Use a separate return type (`ParsedPrompt = Omit<Prompt, "id"> & { id?: string }`) so the merge step can assign one. Only `import-export.ts` uses the missing-id case. The repository's `load` treats a missing id as invalid.
  - **`rating`:** an integer 0–5. If it's missing or invalid, use 0. Round and clamp it; don't reject the prompt over it.
  - **`note`:** a string or null. Trim it, and an empty string becomes null. Truncate at `NOTE_MAX`.
  - **`createdAt` / `updatedAt`:** strings that `Date.parse` accepts. If invalid or missing, return them as `undefined`, and the caller fills in the current time. Again, the `ParsedPrompt` type allows this.
  - **Unknown keys** (such as the old `tokens` or `date`) are dropped silently.
- `parseExportFile(json: unknown): { items: unknown[] } | null` accepts either:
  - our export envelope `{ app: "promptvault", version: 1, prompts: [...] }`, or
  - a bare array of prompt objects.

  Anything else returns `null`, which means "not a PromptVault file".

## Step 3: Import/export logic (`app/lib/prompts/import-export.ts`)

Everything here is pure and has no browser APIs.

```ts
export type ExportFile = { app: "promptvault"; version: 1; exportedAt: string; prompts: Prompt[] };

export function buildExportFile(prompts: Prompt[], now: Date): ExportFile;

export type MergeResult = {
  toAdd: Prompt[];         // fully-formed, ready to persist
  duplicates: number;
  invalid: number;
};

export function mergeImport(
  existing: Prompt[],
  items: unknown[],
  deps: { now: Date; newId: () => string },
): MergeResult;
```

`mergeImport` rules:
1. Run each item through `parsePrompt`. A `null` result counts toward `invalid`.
2. **Duplicate check:** an item is a duplicate if **either** of these is true, counting both the existing prompts and items already accepted from the same file:
   - its `id` matches an existing id, or
   - its **content key** matches. The content key is `title + "\u0000" + model + "\u0000" + content`, after trimming and **case-sensitive**.

   Each duplicate increments `duplicates` and is skipped. The existing prompt is **never** overwritten.
3. **Fill gaps:** a missing `id` gets `deps.newId()`. A missing `createdAt` gets `deps.now.toISOString()`. A missing `updatedAt` gets the value of `createdAt`.
4. The imported prompts **keep their original `createdAt`**, so they sort into the list by date and don't all jump to the top.

`now` and `newId` are injected so the tests are deterministic.

## Step 4: Repository

### `app/lib/prompts/repository.ts`

```ts
import type { Prompt, PromptInput, PromptPatch } from "./types";

/** Storage boundary. Phase 2: localStorage. Phase 3: Supabase. UI code only talks to this. */
export interface PromptRepository {
  list(): Promise<Prompt[]>;                                   // newest first (createdAt desc)
  create(input: PromptInput): Promise<Prompt>;                 // assigns id + timestamps
  update(id: string, patch: PromptPatch): Promise<Prompt>;     // bumps updatedAt; throws if id missing
  remove(id: string): Promise<void>;                           // no-op if already gone
  restore(prompt: Prompt): Promise<void>;                      // re-insert exactly as given (undo)
  addMany(prompts: Prompt[]): Promise<void>;                   // import; caller already de-duplicated
  subscribe(onExternalChange: () => void): () => void;         // changes made elsewhere (other tabs now, realtime later)
}
```

### `app/lib/prompts/local-storage-repository.ts`

**Storage format:**
- Key: `promptvault-prompts`.
- Value: `JSON.stringify({ version: 1, prompts: Prompt[] })`.
- Export the key constant.

**Implementation:** `createLocalStorageRepository(storage: Storage = window.localStorage): PromptRepository`. Taking `storage` as a parameter lets the tests pass an in-memory fake.

- **Private `load()`:**
  - If the key is missing, return `[]`.
  - If the value is present, parse it, run each entry through `parsePrompt`, and drop entries that are invalid or have no id.
  - If `JSON.parse` fails or the shape is wrong:
    1. **Don't overwrite the data.** Copy the raw string to `promptvault-prompts-corrupt-<timestamp>`.
    2. `console.error` a message.
    3. Return `[]`.
  - Storage access can throw, for example in private mode or when access is blocked. Let the error propagate, and the provider surfaces it.
- **Private `save(prompts)`:** writes the envelope. If the write throws (for example `QuotaExceededError`), the error propagates.
- **Sorting:** every method that returns a list sorts by `createdAt` descending. Ties break by `id` so the order is stable.
- **`create`:**
  1. Normalize the input.
  2. Check `isValidInput` and throw if it fails.
  3. Build the prompt: `id: crypto.randomUUID()`, `rating: 0`, `note: null`, and `createdAt = updatedAt = new Date().toISOString()`.
  4. Save it.
- **`update`:**
  1. Apply the patch.
  2. Re-validate. Trim the text fields, and clamp `rating` to an integer 0–5.
  3. Set `updatedAt` to now.
  4. Save.
- **`restore`:** if no prompt with the same id exists, insert the given prompt unchanged.
- **`addMany`:** append the prompts and save once.
- **`subscribe`:** add a `window` listener for the `storage` event, filtered to `event.key === KEY` (or `null`, which means `localStorage.clear()`). Return the unsubscribe function.
- **Every method is `async`**, so its return type matches the future network-backed implementation.

## Step 5: Date formatting (`app/lib/prompts/format.ts`)

`formatPromptDate(iso: string, now: Date = new Date()): string`

- Use `Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })`, which gives output like "Sep 18, 9:47 AM", matching the Phase 1 design.
- If the year differs from `now`'s year, add `year: "numeric"`.
- Cache the two formatters at module level.

Formatting in the viewer's locale during render is safe here. The list only renders after the client has loaded from storage, so the list is never server-rendered and there is no hydration mismatch (see Step 7). Put a one-line comment in `prompt-card.tsx` saying so.

In the card, render the date inside `<time dateTime={createdAt}>`.

## Step 6: Toasts (`app/components/toast.tsx`, `"use client"`)

**API:** `ToastProvider` and `useToast()`, which returns:
- `show({ message, tone?: "info" | "error", action?: { label, onClick } })`
- `dismiss()`

**Behavior:**
- Only one toast shows at a time. A new toast replaces the current one.
- Auto-dismiss: 6000 ms for info, 8000 ms for error. Use `setTimeout` in the `show` handler, or in an effect keyed on the toast's id. Clear the timer on unmount and on replace.
- Clicking the action runs `onClick`, then dismisses the toast.

**Markup:**
- An always-mounted live region: `<div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">`.
- The toast inside it: `pointer-events-auto flex max-w-[480px] items-center gap-4 rounded-field border border-muted/35 bg-surface px-4 py-3 text-[14px] text-ink shadow-card dark:shadow-card-dark`.
- The error tone adds `border-l-[3px] border-l-hl-2`.
- The action button uses the same style as the Notes "Add" pill: `${pillSmall} border border-hl-1 px-3 py-[5px] text-hl-1 shrink-0`.

Use existing tokens only. Don't add new colors.

## Step 7: Prompts provider (`app/components/prompts-provider.tsx`, `"use client"`)

`PromptsProvider` takes `{ children, repository? }`. The default repository is created lazily on the client: use `useState(() => …)` guarded so it only runs in the browser, or create it inside the load effect and keep it in a ref.

**State:**
- `status: "loading" | "ready" | "error"`
- `prompts: Prompt[]`
- `error: string | null`

**Loading:**
- Initial state is `status: "loading"` and `prompts: []`. The **server render and the first client render are both "loading"**, so hydration always matches.
- In a `useEffect`, call `repository.list().then(...)` and `.catch(...)`, with a `cancelled` flag for cleanup. `setState` is only called inside the promise callbacks, which satisfies `set-state-in-effect`.
- In the same effect, `repository.subscribe(() => reload())` handles changes from other tabs.

**Context value:** `status`, `prompts`, `error`, and these async actions. Each action updates state from the repository's result. None of them re-lists everything, except `reload`.

| Action | Does |
|---|---|
| `addPrompt(input)` | `create`, then insert and re-sort |
| `updatePrompt(id, patch)` | `update`, then replace by id |
| `deletePrompt(id)` | `remove`, then filter it out. Returns the removed `Prompt` so the caller can offer Undo. |
| `restorePrompt(prompt)` | `restore`, then insert and re-sort |
| `importPrompts(items: unknown[])` | `mergeImport(prompts, items, { now: new Date(), newId: () => crypto.randomUUID() })`, then `addMany(toAdd)`, then insert and re-sort. Returns the `MergeResult`. |

- **Sorting:** export one sort helper (createdAt desc, then id) from `app/lib/prompts/types.ts`, or from a small `sort.ts`. Both the repository and the provider use it.
- **Errors:** every action catches repository errors, shows an error toast ("Couldn't save your changes. Your browser storage may be full or disabled."), and re-throws so callers can keep their form state. `ToastProvider` must therefore wrap `PromptsProvider`.
- Export `usePrompts()`. It throws a clear error if used outside the provider.

## Step 8: Page wiring

**`app/page.tsx`** (stays a Server Component):

```tsx
<ToastProvider>
  <PromptsProvider>
    <div className="mx-auto max-w-[1180px] px-8 pt-14 pb-24">
      <Header />
      <PromptVault />
    </div>
  </PromptsProvider>
</ToastProvider>
```

**`app/components/header.tsx`:** keep it a Server Component. Replace the two inert ghost buttons with `<LibraryActions />`. Move the `ghostButton` constant into `styles.ts` so `LibraryActions` can use it.

## Step 9: Export and Import (`app/components/library-actions.tsx`, `"use client"`)

This component renders the same two ghost buttons, with the same icons, text, and `title` attributes as today.

### Export

- Disabled while `status !== "ready"` or when `prompts.length === 0`.
- Disabled style: add `disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-muted/35 disabled:hover:text-ink` to this button. Add these at the use site, not to the shared constant, because the shared constant already sets `hover:`.
- On click:
  1. `buildExportFile(prompts, new Date())`
  2. `downloadJson(file, \`promptvault-export-${yyyy-mm-dd}.json\`)`, using the **local** date.
  3. Toast: "Exported N prompt(s)."

**`app/lib/download.ts`:** `downloadJson(data, filename)` does the following:
1. Create a Blob with `JSON.stringify(data, null, 2)` and type `application/json`.
2. `URL.createObjectURL`
3. Create a temporary `<a download>`, click it, and remove it.
4. `URL.revokeObjectURL`

### Import

- A visually hidden `<input ref type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange=…>`. The Import button calls `inputRef.current?.click()`.
- Disabled while `status !== "ready"`.
- **`onChange`:**
  1. Take the first file.
  2. **Reset `e.target.value = ""` right away**, so choosing the same file again still fires `onChange`.
  3. Reject files over 5 MB with an error toast.
  4. Read the file with `await file.text()`, then `JSON.parse` it inside try/catch.
  5. Run `parseExportFile`. If the result is `null`, show the error toast "That file isn't a PromptVault export."
  6. Call `importPrompts(items)`, then show the result toast.
- **Result toast copy.** Pluralize correctly, and join the clauses naturally:
  - "Imported 3 prompts."
  - "Imported 3 prompts. Skipped 2 duplicates and 1 invalid entry."
  - If nothing was added: "No new prompts to import. 4 duplicates skipped." (with the invalid count added if there is one)

  Put the message builder in `import-export.ts` as a pure function `describeMergeResult(result)`, so it's unit-tested.

## Step 10: Shared prompt fields (`app/components/prompt-fields.tsx`)

Pull the Title/Model/Content label, field and hint blocks out of `add-prompt-form.tsx` into a component, so the add form and the edit mode share them.

```ts
type PromptFieldsProps = {
  values: PromptInput;
  onChange: (values: PromptInput) => void;
  contentRows: number;             // 7 in the add form, 6 in edit mode
  titleRef?: React.Ref<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler; // edit mode uses this for Escape
};
```

- Ids come from `useId()`. Hardcoded ids like `pv-title` would collide once several cards are in edit mode at the same time.
- Use `TITLE_MAX` and `MODEL_MAX` from `types.ts` for `maxLength` and in the hint text.
- **Visual output must be identical** to the current add form: same classes, placeholders and hints.

**`add-prompt-form.tsx`:**
- Use `<PromptFields>` and `isValidInput`.
- `handleSubmit` becomes async:
  1. `await addPrompt(values)`.
  2. **On success only**, clear the fields and refocus Title.
  3. On failure, keep the typed values. The provider has already shown a toast.
- Keep `disabled={!canSave}`. Also disable while a save is in flight (`pending` state) to prevent double submits.

## Step 11: Prompt card changes (`app/components/prompt-card.tsx`)

The card now reads its actions from `usePrompts()` and `useToast()` directly. `PromptVault` only passes `prompt`. This removes the Phase 1 callback props.

**Top-row layout:** change the row to `flex flex-wrap items-start justify-between gap-x-4 gap-y-3`, and give the title column `min-w-0 flex-1 basis-[240px]`. On wide cards nothing changes. On narrow screens the buttons wrap below the title instead of squeezing it to a sliver.

**Content:** move the content **out of** the top row. The top row's left column now holds only the `<h3>`; drop its `mb-1.5`. Directly after the top row, render `<PromptContent content={content} />` (see Step 11a) with `mt-1.5` on its wrapper, which keeps the Phase 1 spacing between title and content. This way, when the buttons wrap on narrow screens they land right under the title, not below the content.

**Top-row buttons:** change the single Delete button into `<div className="flex shrink-0 gap-2">` holding **Edit** and **Delete**.
- Both share the current Delete classes. Move them to `styles.ts` as `pillOutline`, **without** the hover color.
- Edit adds `hover:border-hl-1 hover:text-hl-1`, and Delete adds `hover:border-hl-2 hover:text-hl-2`.
- Edit has `aria-label={\`Edit ${title}\`}`.
- Hide both buttons while the card is in edit mode.

**Delete with Undo:**
1. `const removed = await deletePrompt(id)`.
2. `toast.show({ message: \`Deleted “${title}”.\`, action: { label: "Undo", onClick: () => restorePrompt(removed) } })`.
3. Move focus to the "Saved Prompts" `<h2>`. Give it `tabIndex={-1}` and target it by id, for example `document.getElementById("saved-prompts-heading")?.focus()` in the handler. Otherwise keyboard focus falls back to `<body>` when the card unmounts.

**Badges row:**
- Remove the tokens badge.
- Keep the model badge.
- The date becomes `<time dateTime={createdAt}>{formatPromptDate(createdAt)}</time>` with the same `text-[13px] text-muted` classes.

**Edit mode:**
- Local state: `const [editing, setEditing] = useState(false)`.
- While editing, render `<PromptEditor prompt={prompt} onDone={() => setEditing(false)} />` **in place of** the title, content and badges. Stars and Notes stay visible below and keep working.

**Rating and notes** call `updatePrompt(id, { rating })` and `updatePrompt(id, { note })`. Keep `PromptNotes` as it is, except that its `onChange` now calls `updatePrompt`.

## Step 11a: Prompt content, expand toggle, and copy (`app/components/prompt-content.tsx`, `"use client"`)

Props: `{ content: string }`. This component owns two pieces of local UI state, `expanded` and `copied`. Neither one is persisted.

**Markup:**

```tsx
<div className="mt-1.5">
  <p id={contentId} className={…}>{content}</p>
  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
    {/* Show more / Show less — only when needed */}
    {/* Copy prompt */}
  </div>
</div>
```

- `contentId` comes from `useId()`.
- **Collapsed `<p>`** uses the Phase 1 classes, unchanged: `m-0 max-w-[60ch] line-clamp-2 text-[14px] leading-[1.5] text-muted`.
- **Expanded `<p>`** swaps `line-clamp-2` for `whitespace-pre-wrap break-words`, so the prompt's own line breaks show. Prompts are often multi-line.
- **Shared link-button style:** add `linkButton` to `styles.ts`: `inline-flex items-center gap-1.5 rounded text-[12.5px] font-bold text-hl-1 cursor-pointer hover:underline` plus `focusRing`.

**Show more / Show less:**
- Render it only when `overflowing || expanded`. Short prompts that fit in 2 lines get no toggle.
- Detect overflow with a `ref` on the `<p>` and a `ResizeObserver`, created in a `useEffect`. In its callback, run `setOverflowing(el.scrollHeight > el.clientHeight + 1)`, and only while the content is collapsed. When expanded, leave `overflowing` as it is, so the toggle stays visible to collapse it again.
  - `ResizeObserver` calls its callback once right after `observe()`, so the effect body itself never calls `setState`. This satisfies the `set-state-in-effect` lint rule.
  - Disconnect the observer in the effect cleanup.
  - Include `expanded` and `content` in the dependency list, so the check re-runs after an edit and after collapsing.
- `<button type="button" aria-expanded={expanded} aria-controls={contentId}>`, with the text `{expanded ? "Show less" : "Show more"}`.

**Copy prompt:**
- `<button type="button">` with `<CopyIcon />` and the text "Copy prompt". While `copied` is true, show `<CheckIcon />` and the text "Copied". Make sure swapping the label doesn't shift the layout noticeably.
- On click:
  1. `await navigator.clipboard.writeText(content)`, which copies the **full** content even while collapsed.
  2. Set `copied` to true, and set it back to false after 2000 ms. Keep the timer id in a ref, clear it before starting a new one, and clear it on unmount in an effect cleanup.
  3. If `writeText` throws or `navigator.clipboard` is missing, show the error toast "Couldn't copy. Select the text and copy it manually." and set `expanded` to true so the full text is easy to select.
- **Announce it for screen readers:** add `<span className="sr-only" aria-live="polite">{copied ? "Prompt copied to clipboard" : ""}</span>` inside the component. Don't use the toast for successful copies, because it would replace an active Undo toast.

**Icons** (`icons.tsx`): add `CopyIcon` and `CheckIcon` in the same style as `ExportIcon`: 14px, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`, round caps and joins, `aria-hidden="true"`.
- Copy: `<rect x="9" y="9" width="13" height="13" rx="2" />` and `<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />`
- Check: `<path d="M20 6L9 17l-5-5" />`

**In edit mode**, `PromptEditor` replaces the title, content and badges (Step 11), so `PromptContent` isn't rendered while editing.

## Step 12: Inline editor (`app/components/prompt-editor.tsx`)

- State: `values`, initialized from `prompt` (title, model, content). Plus `pending`.
- Render `<PromptFields contentRows={6} …>`, focusing Title on mount via `autoFocus` or a ref in an effect. Then `<div className="flex gap-2">` with two buttons, using the same classes as the note Save/Cancel buttons (`pillSmall` + `px-3.5 py-[7px]` …):
  - **Save:** filled `bg-hl-1`. Disabled when `!isValidInput(values)`, when `pending`, or when nothing changed. Add `disabled:cursor-not-allowed disabled:opacity-50`. On click, `await updatePrompt(id, normalizeInput(values))` and then `onDone()`. On error, stay in edit mode.
  - **Cancel:** outlined. Calls `onDone()` and discards the changes.
- Pressing **Escape** in any field cancels. Pressing **Enter** in the single-line inputs submits: wrap the fields in a `<form onSubmit>` so Enter works natively. In the textarea, Enter inserts a newline as usual.
- Moving the pill-button class strings into `styles.ts` (for example `pillFilled`, `pillOutlineMuted`) is fine, and `prompt-notes.tsx` should use them too. Don't change any visual output.

## Step 13: Star rating (`app/components/star-rating.tsx`)

- **Clear by re-click:** `onClick={() => onChange(n === value ? 0 : n)}`.
- **aria-label:** when `n === value`, use `Clear rating (currently ${n} star${n > 1 ? "s" : ""})`. Otherwise keep `Rate ${n} star${n > 1 ? "s" : ""}`.
- Add `aria-pressed={n <= value}` to each star.
- Add `title` attributes with the same text as the aria-label, so mouse users can discover the clear action.

## Step 14: PromptVault list (`app/components/prompt-vault.tsx`)

- Read `status` and `prompts` from `usePrompts()`. Remove the local state and handlers.
- Add `tabIndex={-1}` and `focus:outline-none` to the `Saved Prompts` `<h2>`, which is the focus target after a delete.
- **`status === "loading"`:** render the header **without** the count badge and **no list body**. localStorage loads within a frame, so a "Loading…" message would only flicker. Phase 3 will add a real skeleton when the data comes over the network.
- **`status === "error"`:** render the empty-state box (dashed style) with the text "Couldn't load your prompts. Your browser may be blocking local storage." in `text-hl-2`.
- **`status === "ready"`:** behaves as today, with the count badge, the empty state, and the cards. The only prop cards get is `prompt`.

## Step 15: Fixture (`fixtures/sample-prompts.json`)

This file holds the two former seed prompts in the export envelope format:
- `app: "promptvault"`, `version: 1`
- ids `seed-1` and `seed-2`
- `createdAt` values `2026-09-18T09:47:00` and `2026-09-20T14:05:00` in ISO form with `Z`
- `updatedAt` equal to `createdAt`
- the ratings, notes and text copied from git history (`git show main:app/lib/prompts.ts`)
- **no** `tokens` field

Use it for manual import testing and in the unit tests.

## Step 16: Unit tests (Vitest)

**Setup:** follow `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`.
- Install only what the tests need: `vitest` and `vite-tsconfig-paths`, as devDependencies. There are no component tests, so don't add jsdom or Testing Library.
- Add `"test": "vitest run"` to `package.json`.
- Tests go next to the code as `*.test.ts`.

**Required cases:**

**`validate.test.ts`:**
- A valid prompt round-trips.
- Title, model and content are trimmed.
- Empty or whitespace-only title, model or content returns `null`.
- Text over the max length returns `null`.
- An out-of-range or non-integer rating is clamped or rounded.
- An empty note becomes `null`.
- Unknown keys (such as `tokens`) are dropped.
- `parseExportFile` accepts both the envelope and a bare array, and rejects `{}`, strings and `null`.

**`import-export.test.ts`:**
- New items are added, with a generated id and `now` filled in.
- A matching id counts as a duplicate.
- Matching title, model and content with a different id counts as a duplicate.
- Duplicates *within* the same file count after the first one.
- Invalid entries are counted.
- An existing prompt is never modified.
- The original `createdAt` is preserved.
- `describeMergeResult` produces the copy for each case listed in Step 9.

**`local-storage-repository.test.ts`** (with an in-memory `Storage` fake):
- `create` then `list` returns the prompt.
- The list is newest-first.
- `update` bumps `updatedAt` and clamps the rating.
- `update` on a missing id throws.
- `remove` and `restore` round-trip the exact object.
- A corrupt stored value is backed up under the `-corrupt-` key and `list` returns `[]`.
- A stored entry that has lost its id is dropped.

## Step 17: Verify

1. `npm run lint`, `npm run test` and `npm run build` all pass.
2. With `npm run dev` and localStorage cleared, the app shows the empty state, the count is 0, and **Export is disabled**. There are no hydration warnings in the console.
3. **Persistence:** add 3 prompts, rate one, add a note, edit one, then reload. Everything is still there, with the same order and data.
4. **Edit:**
   - Save is disabled when a field is blank or nothing changed.
   - Escape cancels.
   - Enter in Title saves.
   - `updatedAt` changes and `createdAt` doesn't. Check in DevTools under Application → Local Storage.
5. **Rating:** clicking the current star clears it to 0 stars, and the clear persists across reload.
6. **Delete and Undo:**
   - Deleting removes the card, shows the toast, and moves focus to the "Saved Prompts" heading.
   - Undo puts the card back **in its original position**, with the same id, rating and note.
   - Without Undo, the toast disappears after about 6 seconds and the deletion persists after reload.
7. **Export:** the downloaded file is named `promptvault-export-YYYY-MM-DD.json`, contains the envelope with every prompt, and has no `tokens` field.
8. **Import:**
   - Importing `fixtures/sample-prompts.json` adds 2 prompts and sorts them by their September dates.
   - Importing the same file again reports "No new prompts to import. 2 duplicates skipped."
   - Importing the app's own export file adds nothing.
   - Importing a `.json` file containing `{"foo":1}` shows "That file isn't a PromptVault export."
   - Importing a non-JSON file shows the same error, with no crash.
   - Selecting the same file twice in a row triggers an import both times.
9. **Cross-tab:** open two tabs, add a prompt in one, and it appears in the other without a reload.
10. **Corrupt data:** set `promptvault-prompts` to `not json` in DevTools and reload. The app shows the empty state, and a `promptvault-prompts-corrupt-…` key exists.
11. **Show more and Copy:**
    - A short, one-line prompt shows **no** Show more toggle, only Copy prompt.
    - A long prompt shows Show more. Expanding it reveals the full text with its line breaks, and Show less re-clamps it. `aria-expanded` flips each time.
    - After editing a short prompt into a long one (or the reverse), the toggle appears or disappears correctly.
    - Resizing the window from 1280 to 375 makes the toggle appear when the text starts overflowing.
    - Copy prompt puts the **full** content on the clipboard, even while collapsed (paste it somewhere to check). The button shows "Copied" for about 2 seconds and then reverts.
    - Copying right after a delete does **not** dismiss the Undo toast.
    - At 375px wide, Edit and Delete wrap below the title, and the title is never squeezed narrower than the buttons.
12. **Visual regression:** at 1280 and 375 widths in both themes, the add form, cards, notes and header look the same as Phase 1, except that the tokens badge is gone, and the Edit button, the Show more/Copy row and the toast are new. These new elements use only existing tokens and look native to the design.
13. **Keyboard:** every new control (Edit, Save/Cancel in the editor, Undo, Export, Import, clear-rating, Show more/Show less, and Copy prompt) is reachable by Tab, shows a focus ring, and works with Enter or Space.

## Phase 3 preview (context only, don't build)

This is the reasoning behind the shape of the repository:
- A `SupabasePromptRepository` implements the same interface. It maps camelCase fields to snake_case columns and adds `user_id`, with Row Level Security restricting rows to `auth.uid()`.
- Auth via Supabase, and deploy on Vercel.
- On a user's first login, offer to upload their local prompts via `addMany`, using the same `mergeImport` de-duplication.
- `subscribe` becomes Supabase Realtime.
- The `status: "loading"` branch gets a real skeleton.
