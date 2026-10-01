# PromptVault: search and pagination

## Context

Phase 2 (PR #2) made the library persistent but renders every prompt in one list, and has no way to find one. Search, filter and sort were explicitly out of scope there. This plan adds **search** and **pagination** to the Saved Prompts list.

**Branch:** `add/search-and-pagination`, created from `add/phase-two-functionality` because PR #2 isn't merged yet. When PR #2 merges, retarget this branch's PR to `main`.

**Stack and rules:** unchanged from Phase 2. The Phase 2 plan's "Tailwind v4 preflight traps" and its `react-hooks` lint notes (`set-state-in-effect`, `purity`, `refs`) all still apply. AGENTS.md still applies, but nothing here is Next.js-specific, since state stays in components (see decisions).

## Decisions already made (don't re-ask)

| Topic | Decision |
|---|---|
| Where | Own branch and PR. PR #2 is not extended. |
| Search matches | Title, content, model and note. |
| Pagination style | A "Load more prompts" button, **10 at a time**. No numbered pages, no infinite scroll. |
| State | Component state only. Reload resets the search. Nothing goes in the URL. |

## Defaults chosen in this plan (veto any of these)

1. **Matching:** case-insensitive substring. A query with several words matches when **every word** appears somewhere in the four fields (AND), in any order or field.
2. **Search box visibility:** shown whenever the library has at least one prompt. Hidden in the loading, error and empty-library states.
3. **After adding a prompt:** the search is cleared, so the new prompt is visible instead of silently filtered out.
4. **After editing a prompt so it no longer matches:** it leaves the list on save, like any other non-matching prompt. No special handling.
5. **Export ignores the search.** It always exports the whole library. Import is unchanged.
6. **Storage interface unchanged.** Searching and paging are pure functions over the full in-memory list. When Phase 3 moves to Supabase, these become `list({ query, limit, cursor })` on the repository, and the pure functions here are the behavior to match. Don't change `PromptRepository` now.
7. **Page size** is a constant, `PAGE_SIZE = 10`, and is not user-configurable.

Out of scope: sort controls, model or rating filters, tags, highlighting matched text, URL state, persisting the search, a debounce (see Step 4 for the measurement that would justify one).

## Step 0: Read before coding

- `app/components/prompt-vault.tsx` (the list, the count badge, the empty and error states)
- `app/components/styles.ts` (reuse `field`, `label`, `linkButton`, `pillAccent`; don't invent colors)
- `app/components/prompts-provider.tsx` (`status`, `prompts`; the actions don't change)
- `app/components/prompt-card.tsx` (focus handling after delete targets `#saved-prompts-heading`)

## Target file layout

```
app/lib/prompts/search.ts              (new)    filterPrompts, buildSearchIndex, PAGE_SIZE, pageOf
app/lib/prompts/search.test.ts         (new)    unit tests
app/components/prompt-search.tsx       (new, "use client")  search input + clear
app/components/prompt-vault.tsx        (modify) query + visibleCount state, filtered list, Load more
app/components/add-prompt-form.tsx     (modify) clear the search after a successful add
app/components/icons.tsx               (modify) add SearchIcon (only if the input uses one)
app/components/styles.ts               (modify) only if a new shared constant is needed
```

## Step 1: Pure logic (`app/lib/prompts/search.ts`)

No browser APIs. Everything here is unit-tested.

```ts
export const PAGE_SIZE = 10;

export type SearchIndexEntry = { prompt: Prompt; haystack: string };

/** Lowercased "title\ncontent\nmodel\nnote" per prompt, built once per list change. */
export function buildSearchIndex(prompts: Prompt[]): SearchIndexEntry[];

/** Returns matching prompts in their existing order. Empty or whitespace query returns all. */
export function filterPrompts(index: SearchIndexEntry[], query: string): Prompt[];
```

Rules:
- Normalize the query: trim, lowercase, split on whitespace into terms. No terms means no filtering.
- An entry matches when every term is a substring of its `haystack`.
- Use `toLowerCase()` on both sides. Don't add locale or diacritic folding.
- A `null` note contributes nothing to the haystack.
- Don't treat the query as a regex. Characters like `(`, `[` and `.` are literal.
- Filtering never reorders: results keep the list's newest-first order.

## Step 2: Search input (`app/components/prompt-search.tsx`)

Props: `{ value: string; onChange: (value: string) => void; resultCount: number; total: number }`.

- `<input type="search">` with a real `<label>` (visually hidden with `sr-only`, text "Search prompts") and the placeholder "Search title, content, model or note…". Use the shared `field` constant for the input. No new colors.
- A **Clear** button (`linkButton`) shown only while the query is non-empty. It clears the query and returns focus to the input.
- **Escape** in the input clears the query.
- An `aria-live="polite"` `sr-only` status: "N prompts found" while a query is active, empty otherwise. Don't announce on every keystroke for an empty query.
- Layout: sits between the "Saved Prompts" heading row and the list, with `mb-5`. It must not change the heading row or the card layout.

## Step 3: Vault wiring (`app/components/prompt-vault.tsx`)

State, both in `PromptVault`:
- `query: string`
- `visibleCount: number`, initially `PAGE_SIZE`

Derived during render, with `useMemo`:
- `index = buildSearchIndex(prompts)` keyed on `prompts`
- `matches = filterPrompts(index, query)`, keyed on `index` and `query`
- `shown = matches.slice(0, visibleCount)`

**Reset the page size without an effect.** `set-state-in-effect` is an error, so reset in the event handler that changes the query:

```ts
function handleQueryChange(next: string) {
  setQuery(next);
  setVisibleCount(PAGE_SIZE);
}
```

Rendering:
- **Count badge:** shows `matches.length`. With an active query it is the number of matches, and the "N prompts found" status above covers the rest. The existing badge classes don't change.
- **No matches (query active, zero results):** the same dashed empty-state box, with text `No prompts match “{query}”.` and a **Clear search** `linkButton` inside it. Keep the text color rule from Phase 2 (`text-muted`).
- **Empty library:** unchanged ("No prompts saved yet. Add your first one!"), and no search box.
- **Footer under the list**, shown when `matches.length > shown.length`:
  - a muted line "Showing {shown.length} of {matches.length}" (`text-[13px] text-muted`)
  - a **Load more prompts** button (`pillAccent`-style, with the `cursor-pointer` and `focusRing` rules). Don't reuse the label "Show more", which already means expand-a-card.
  - On click: `setVisibleCount((n) => n + PAGE_SIZE)`.
- **Focus after Load more:** move focus to the **Edit button of the first newly revealed card**, so keyboard and screen reader users land on the new content rather than staying on a button that moves. Do this by remembering the target id in a ref inside the click handler and focusing after render in an effect that only reads the ref (no `setState` in the effect). If the button unmounts because everything is loaded, this is also what keeps focus from falling to `<body>`.

Interactions with existing behavior (each is verified in Step 6):
- **Add prompt:** `AddPromptForm` calls an `onAdded` callback (or a context method) on success that sets `query` to `""` and `visibleCount` back to `PAGE_SIZE`. This is default 3. Keep the add form's own props otherwise unchanged.
- **Delete and Undo:** restore re-inserts in sorted position. If the restored prompt sorts beyond `visibleCount`, it is still counted but not shown until Load more. That is acceptable; the Undo toast still confirms it.
- **Delete shrinks the page:** `slice` handles `visibleCount` larger than the list.
- **Import and cross-tab changes:** `prompts` changes, the index rebuilds, `query` and `visibleCount` are preserved.
- **Edit mode:** editing a card that is in `shown` keeps it in `shown` until the save changes whether it matches (default 4).

## Step 4: Performance check

Content can be up to 50,000 characters, so a worst-case library is large. `buildSearchIndex` runs once per `prompts` change, not per keystroke. As part of verification (Step 6), generate about 1,000 prompts with long content by importing a generated file, and measure the time from keystroke to updated list. If typing feels laggy (more than about 50ms per keystroke), add `useDeferredValue(query)` for `matches`. Don't add a debounce or the deferral before measuring.

## Step 5: Unit tests (`app/lib/prompts/search.test.ts`)

Vitest, pure functions only, same style as the existing tests:
- An empty or whitespace query returns every prompt, in order.
- Matches title, content, model and note independently.
- Case-insensitive.
- Multiple words are AND-ed across different fields.
- A word that matches nothing returns an empty list.
- A `null` note doesn't break matching and doesn't match the word "null".
- Regex characters (`.`, `(`, `[`, `*`) are treated literally.
- Results keep the input order.
- `buildSearchIndex` doesn't mutate its input.

## Step 6: Verify

1. `npm run lint`, `npx tsc --noEmit`, `npm run test` and `npm run build` pass. Run lint and `tsc` after Step 3.
2. **Search:** with the fixture plus about 15 prompts, typing filters live. Each of title, content, model and note matches. Case doesn't matter. Two words match across fields. The count badge and the "N prompts found" status update.
3. **No results:** shows the message and a Clear search button. Clear restores the list and returns focus to the search input.
4. **Escape** in the search box clears it. Clear button works with Enter and Space.
5. **Pagination:** with 25 prompts, 10 show with "Showing 10 of 25". Load more gives 20, then 25, after which the footer disappears. Focus lands on the first new card's Edit button each time, and never falls to `<body>`.
6. **Reset:** typing a query after loading more resets to 10 results.
7. **Add:** adding a prompt while a query is active clears the query and shows the new prompt at the top.
8. **Edit** a prompt so it no longer matches: it leaves the list on save. Cancel keeps it.
9. **Delete and Undo** inside a filtered, paged list: counts stay correct, and Undo restores in place or is counted when beyond the visible window.
10. **Export** while filtered exports the whole library. **Import** while filtered updates the counts and keeps the query.
11. **Cross-tab:** adding a prompt in another tab while a query is active updates this tab correctly.
12. **Performance:** the 1,000-prompt check from Step 4.
13. **Visual:** at 1280 and 375 in both themes, the add form, header and cards are unchanged from Phase 2. The new search box and footer use only existing tokens and constants, and look native to the design. No horizontal scroll at 375.
14. **Keyboard:** the search box, Clear, Clear search and Load more prompts are reachable by Tab, show a focus ring, and work with Enter or Space.
15. No hydration warnings or console errors.

## Phase 3 preview (context only, don't build)

When prompts come from Supabase, fetching everything stops scaling. The repository gains `list({ query?, limit, cursor? })`, the provider holds one page at a time, and Load more fetches the next cursor. `filterPrompts` then becomes the reference behavior for the server-side query (or Postgres full-text search on title, content, model and note). The UI in this plan should not need to change.
