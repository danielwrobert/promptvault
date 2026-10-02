# PromptVault: search and pagination (revised)

## Context

Phase 2 (PR #2, merged) made the library persistent. It still renders every prompt in one list, though, and gives no way to find one. Search, filter and sort were explicitly out of scope in Phase 2. This plan adds **search** and **pagination** to the Saved Prompts list.

**Branch:** `add/search-and-pagination`, off `main`. Own PR to `main`.

**Stack and rules:** unchanged from Phase 2. The Phase 1 "Tailwind v4 preflight traps" all still apply:
- pixel font sizes
- `cursor-pointer` on every button
- `border` paired with a color
- don't override properties inside shared constants
- no hex

The Phase 2 `react-hooks` lint notes (`set-state-in-effect`, `purity`, `refs`) also still apply. AGENTS.md applies too, but nothing here touches Next.js APIs.

## Decisions already made (don't re-ask)

| Topic | Decision |
|---|---|
| Where | Own branch and PR. |
| Search matches | Title, content, model and note. |
| Pagination style | A "Load more prompts" button, **10 at a time**. No numbered pages, no infinite scroll. |
| State | Component state only. Reload resets the search. Nothing goes in the URL. |

## Defaults chosen in this plan (veto any of these)

1. **Matching:** case-insensitive substring. A query with several words matches when **every word** appears somewhere in the four fields (AND), in any order or field.
2. **Search box visibility:** shown when `prompts.length > 0 || query !== ""`. It is hidden in the loading and error states, and in the empty library unless a query is still set. That way a leftover query is never applied out of sight.
3. **After adding a prompt:** the search is cleared, so the new prompt is visible instead of silently filtered out.
4. **After an edit (editor or note) makes a prompt stop matching:** it leaves the list on save. If focus was inside that card, focus moves to the "Saved Prompts" heading, the same as delete. There is no "keep it pinned until the query changes" behavior.
5. **Count display:** the badge always shows the **library total**, as in Phase 2. While a query is active, a visible muted line under the search box reads "3 of 25 prompts" (singular: "1 of 25 prompts"). That line is the `aria-live` region.
6. **Export ignores the search.** It always exports the whole library. Import is unchanged.
7. **Storage interface unchanged.** Searching and paging are pure functions over the full in-memory list. Don't change `PromptRepository` now (see Phase 3 preview).
8. **Page size** is a constant, `PAGE_SIZE = 10`, and is not user-configurable.

Out of scope: sort controls, model or rating filters, tags, highlighting matched text, URL state, persisting the search, and a debounce (see Step 4). Also out of scope: inline note save losing focus when the card *stays* in the list. That already happens today and isn't caused by this change.

## Step 0: Read before coding

- `app/components/prompt-vault.tsx`: the list, the count badge, the empty and error states.
- `app/components/styles.ts`: reuse `field`, `linkButton`, `pillAccent` and `focusRing`. Don't invent colors.
- `app/components/prompts-provider.tsx`: `status` and `prompts`. The actions don't change.
- `app/components/prompt-card.tsx`: the focus handling after delete (`#saved-prompts-heading`) and after closing the editor.
- `app/components/prompt-fields.tsx`: the `titleRef` prop pattern, which `inputRef` mirrors.
- `app/lib/prompts/sort.ts`: the list is already newest-first, and filtering must keep that order.

## Target file layout

```
app/lib/prompts/search.ts              (new)    PAGE_SIZE, buildSearchIndex, filterPrompts
app/lib/prompts/search.test.ts         (new)    unit tests
app/components/prompt-search.tsx       (new, "use client")  search input, Clear, results line
app/components/prompt-vault.tsx        (modify) query + visibleCount state, filtered list, Load more, focus
app/components/prompt-card.tsx         (modify) data-prompt-id, data-card-focus, focus rescue on unmount
app/components/add-prompt-form.tsx     (modify) optional onAdded prop
app/globals.css                        (modify) hide the native search ✕
app/components/icons.tsx               (modify) SearchIcon, only if the input uses one
```

## Step 1: Pure logic (`app/lib/prompts/search.ts`)

No browser APIs. Everything here is unit-tested.

```ts
export const PAGE_SIZE = 10;

export type SearchIndexEntry = { prompt: Prompt; haystack: string };

/** Lowercased "title\ncontent\nmodel\nnote" per prompt, built once per list change. */
export function buildSearchIndex(prompts: readonly Prompt[]): SearchIndexEntry[];

/** Matching prompts in index order. An empty or whitespace query returns every prompt. */
export function filterPrompts(index: readonly SearchIndexEntry[], query: string): Prompt[];
```

Rules:
- Normalize the query: trim, lowercase, split on `/\s+/`. No terms means no filtering.
- An entry matches when every term `includes` in its `haystack`. Fields are joined with `\n`. Terms never contain whitespace, so a term can't match across two fields.
- Use `toLowerCase()` on both sides, with no locale or diacritic folding.
- A `null` note contributes nothing, so it can't match the word "null".
- Never build a `RegExp` from the query.
- Never reorder the results.

## Step 2: Search input (`app/components/prompt-search.tsx`)

Props: `{ value: string; onChange: (value: string) => void; inputRef?: React.Ref<HTMLInputElement>; resultCount: number; total: number }`.

- Use `<input type="search">` with a real `<label>` (`sr-only`, text "Search prompts"). Placeholder: "Search title, content, model or note…". Use the shared `field` constant and add no new colors.
- **Native ✕:** hide `input[type="search"]::-webkit-search-cancel-button` (`appearance: none`) in the global stylesheet, so only the custom Clear shows. Check in Chrome and Safari.
- **Clear** button (`linkButton`): shown only while the value is non-empty. It calls `onChange("")` and focuses the input.
- **Escape:** if the value is non-empty, `preventDefault()` and `onChange("")`. If it's empty, do nothing, so Escape isn't swallowed for no reason.
- **Results line:** a `<p aria-live="polite">` that is always rendered, so the live region exists before it changes. It has `text-[13px] text-muted mt-2`. While a query is active it reads "{resultCount} of {total} prompts". Use "prompt" when `total === 1`. With no query it is empty. Announcing on each keystroke is acceptable because the region is polite.
- **Layout:** between the heading row and the list, wrapped in `mb-5`. Don't change the heading row or the card layout.

## Step 3: Card hooks (`app/components/prompt-card.tsx`)

- Add `data-prompt-id={id}` to the `<article>` and `data-card-focus` to the Edit button. These are the only hooks the vault uses to find a card's focus target.
- **Focus rescue:** when a card unmounts while it holds focus, focus `#saved-prompts-heading`. Do it with a `useLayoutEffect` cleanup:
  - copy `articleRef.current` into a local inside the effect, to keep the `refs` lint quiet;
  - in the cleanup, if `el.contains(document.activeElement)`, focus the heading.
- This covers an edit, a note change, an import or a cross-tab change that makes a focused card stop matching, plus any other unmount of a focused card.
- **Verify in the browser** that the cleanup runs before the article leaves the DOM. If `activeElement` is already `<body>` by then, the check fails. Fall back to having the vault check `document.activeElement === document.body` in a layout effect keyed on the shown ids, and focus the heading there.
- The existing explicit heading focus in `handleDelete` stays.

## Step 4: Vault wiring (`app/components/prompt-vault.tsx`)

State in `PromptVault`:
- `query: string`
- `visibleCount: number`, initially `PAGE_SIZE`
- `searchInputRef`: passed to `PromptSearch`
- `focusTargetId`: a ref holding the prompt id to focus after Load more

Derived during render:
- `index = useMemo(() => buildSearchIndex(prompts), [prompts])`
- `matches = useMemo(() => filterPrompts(index, query), [index, query])`
- `shown = matches.slice(0, visibleCount)`. `slice` already handles `visibleCount` beyond the list.

**Reset without an effect.** Every query change goes through one handler:

```ts
function handleQueryChange(next: string) {
  setQuery(next);
  setVisibleCount(PAGE_SIZE);
}
```

Rendering, in order:
- **Badge:** `prompts.length`, unchanged from Phase 2.
- **Search box:** shown when `status === "ready" && (prompts.length > 0 || query !== "")` (default 2).
- **Empty library** (`prompts.length === 0`): the Phase 2 message "No prompts saved yet. Add your first one!", unchanged.
- **No matches** (`prompts.length > 0 && matches.length === 0`): the same dashed `emptyBox` with `text-muted`.
  - Text: `No prompts match “{query}”.`
  - Below it, a **Clear search** `linkButton` that calls `handleQueryChange("")` and focuses `searchInputRef`.
- **List:** `shown.map(...)`, the same markup as today.
- **Footer**, when `matches.length > shown.length`:
  - a muted line "Showing {shown.length} of {matches.length}" (`text-[13px] text-muted`)
  - a **Load more prompts** button: `pillAccent` plus a hover style, with no overrides of properties already in the constant. Don't use the label "Show more", which already means expand-a-card.

**Load more and focus:**

```ts
function handleLoadMore() {
  focusTargetId.current = matches[shown.length]?.id ?? null;
  setVisibleCount((n) => n + PAGE_SIZE);
}

useEffect(() => {
  const id = focusTargetId.current;
  if (!id) return;
  focusTargetId.current = null;
  document
    .querySelector<HTMLElement>(`[data-prompt-id="${CSS.escape(id)}"] [data-card-focus]`)
    ?.focus();
}, [visibleCount]);
```

The effect only reads and clears a ref, with no `setState`. On mount and after a query reset the ref is null, so the effect does nothing. When the last page loads, the footer unmounts, but focus has already moved to a card.

**Add:** `<AddPromptForm onAdded={() => handleQueryChange("")} />`. In the form, call `onAdded?.()` after a successful `addPrompt`, right after `setValues(EMPTY)`. Focus stays on the title field, as today.

Interactions with existing behavior (each is checked in Step 7):
- **Delete and Undo:** restore re-inserts the prompt in sorted position. If it sorts beyond `visibleCount`, it is counted but hidden until Load more. The Undo toast still confirms it.
- **Import and cross-tab:** `prompts` changes and the index rebuilds. `query` and `visibleCount` are kept.
- **Edit:** a card that still matches stays where it is. A card that stops matching leaves the list, and focus is rescued as in Step 3.

## Step 5: Performance check

localStorage quota (a few MB in every browser) is the real limit on library size, not `CONTENT_MAX`. At that size, building the index (once per `prompts` change) and substring checks on each keystroke should be cheap.

Test it during verification:
- Generate an import file that fills the library to **just under quota**. For example, a few hundred prompts with a few KB of content each. Increase the size until import nearly fails.
- Confirm that no `SAVE_ERROR` toast appears.
- Measure from keystroke to updated list in the Performance panel.
- If a keystroke takes more than about 50ms, use `useDeferredValue(query)` for `matches`. Don't add a debounce or the deferral before measuring.

## Step 6: Unit tests (`app/lib/prompts/search.test.ts`)

Use Vitest with pure functions only, in the same style as `validate.test.ts`. Cover:
- An empty or whitespace query returns every prompt, in order.
- Title, content, model and note each match on their own.
- Matching is case-insensitive.
- Multiple words are AND-ed across different fields, in any order.
- A word that matches nothing returns `[]`.
- A `null` note doesn't break matching and doesn't match "null".
- Regex characters (`.`, `(`, `[`, `*`, `\`) are treated literally.
- A term can't match across a field boundary. For example, a title ending "foo" and content starting "bar" don't match "foobar".
- Results keep the input order.
- `buildSearchIndex` doesn't mutate its input.

## Step 7: Verify

1. `npm run lint`, `npx tsc --noEmit`, `npm run test` and `npm run build` all pass. Run lint and `tsc` after Step 4 as well.
2. **Search** (about 15 prompts): typing filters live. Each field matches, case doesn't matter, and two words match across fields. The badge stays at the total, and "N of M prompts" updates.
3. **Native UI:** there's no native ✕ in Chrome or Safari, only the custom Clear.
4. **No results:** the message and Clear search appear. Clear search restores the list and focuses the input.
5. **Escape** clears a non-empty query. Clear works with Enter and Space.
6. **Pagination** (25 prompts): 10 show with "Showing 10 of 25". Load more gives 20, then 25, and the footer disappears. Each time, focus lands on the first new card's Edit button and never on `<body>`.
7. **Reset:** typing after loading more goes back to 10.
8. **Add** while filtered: the query clears and the new prompt is at the top.
9. **Edit out of the results:** edit a prompt, and separately a note, so it stops matching. It leaves on save, and `document.activeElement` is the heading, not `<body>`. Cancel keeps it.
10. **Delete and Undo** in a filtered, paged list: the counts stay correct, and Undo restores the prompt in place or counts it when it's beyond the window.
11. **Export** while filtered exports the whole library. **Import** while filtered updates the counts and keeps the query.
12. **Stale query:** set a query, delete every prompt, then import. The box reappears showing the query, not a hidden filter.
13. **Cross-tab:** add a prompt in another tab while a query is active. This tab updates correctly.
14. **Performance:** run the quota-sized check from Step 5.
15. **Visual:** at 1280 and 375, in both themes, the add form, header and cards are unchanged. The new search box, results line and footer use only existing tokens and constants. No horizontal scroll at 375.
16. **Keyboard:** search, Clear, Clear search and Load more prompts are all reachable by Tab, show a focus ring, and work with Enter or Space.
17. No hydration warnings or console errors.

## Phase 3 preview (context only, don't build)

When prompts come from Supabase, fetching everything stops scaling. The plan for that phase:
- The repository gains `list({ query?, limit, cursor? })`.
- The provider holds one page at a time, and Load more fetches the next cursor.
- `filterPrompts` becomes the reference behavior for the server query, or for Postgres full-text search over title, content, model and note.

At that point the total/match counts in default 5 need a server count, but the UI shouldn't otherwise change.
