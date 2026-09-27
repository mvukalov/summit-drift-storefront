# Search Spec

## Overview

Add site search: a predictive combobox in the header and a `/search?q=` results page. The combobox uses client-side Apollo (`useLazyQuery`) — the one place in this app that still needs the client Apollo cache — and the results page follows the same fetch-the-whole-set-then-paginate-in-JS pattern the collection page already uses. All decisions below are made in `docs/predictive-search.md` ("Decisions", 2026-09-27) — read it before implementing, don't re-derive.

## Requirements

- `src/lib/graphql/documents/search.graphql`: `Search` query (`search(query, first: 250, types: PRODUCT, sortKey, reverse)`, `... on Product { ...ProductCard }`) and `PredictiveSearch` query (`predictiveSearch(query, limit, types: [PRODUCT]) { products { ...ProductCard } }`). `npm run codegen`; generated output committed.
- `src/lib/search/sort.ts`: `SEARCH_SORT_OPTIONS` (relevance, price-asc, price-desc), mirroring `facets/sort.ts`'s shape; `parseSearchSortParam`, `toSearchSortVariables`.
- `src/lib/search/params.ts`: `parseSearchParams({ q, sort, page })` — Zod, never throws, mirrors `parseFacetsParam`/`parseSortParam`. `q` trimmed and capped defensively at 200 chars; `page` coerced to an integer ≥ 1, falling back to 1. `q` and `page` are already reserved in `facets/url.ts`'s `RESERVED_PARAMS` — no change needed there.
- `src/lib/search/paginate.ts`: pure `paginate(items, page, pageSize = SEARCH_PAGE_SIZE)`, `SEARCH_PAGE_SIZE = 16`. Clamps `page` into `[1, totalPages]` so an out-of-range value still renders something instead of an empty page or a crash.
- `getSearchResults(query, sort)` in `src/lib/catalog/fetchers.ts`: one RSC request with `first: 250`, `force-cache` (search text isn't per-visitor). Returns `{ products: ProductCard[], totalCount }`. Empty `query` short-circuits to `{ products: [], totalCount: 0 }` with no request.
- `src/app/search/page.tsx` (+ `loading.tsx`, `error.tsx`): Server Component reading `q`/`sort`/`page`, calling `getSearchResults` then `paginate`. `generateMetadata` sets `robots: { index: false }` (no canonical needed once noindexed) and a title reflecting the query.
- `src/hooks/useDebouncedValue.ts`: generic debounce-by-effect hook, `(value, delayMs) => debouncedValue`.
- `src/components/molecules/SearchCombobox/`: client component, WAI-ARIA "list autocomplete" combobox pattern (no inline text completion). Debounces the input value 300 ms, then calls `useLazyQuery(PredictiveSearchDocument)` through the existing `ApolloWrapper`. `MIN_QUERY_LENGTH = 2` gates the query (UI choice, not an API limit — the API itself accepts 1 character). `predictiveSearch` `limit = 6`.
- Mount `<SearchCombobox />` in `Header.tsx` next to `CartTrigger`/`MobileNav` — a third client leaf alongside the two existing ones, same composition pattern.
- MSW: `search.ts` and `predictiveSearch.ts` fixtures, `SearchDocument`/`PredictiveSearchDocument` handlers keyed by `variables.query` (matching the existing `variables.handle`-keyed pattern).

## Expected Behavior

- **Typing in the combobox:** below `MIN_QUERY_LENGTH`, nothing fires. At or above it, the query fires 300 ms after the last keystroke. A rapid sequence of keystrokes results in the combobox showing only the last query's results — Apollo Client 4's `useLazyQuery` aborts any still-pending call when a new one starts, so no stale response can overwrite a newer one; no manual cancellation or `try/catch` is needed for this.
- **Keyboard:** `ArrowDown`/`ArrowUp` move the active option (`aria-activedescendant`); `Enter` on an active option navigates to that product; `Enter` with nothing active, or a plain form submit, navigates to `/search?q=<value>`; `Escape` closes the listbox and returns focus to the input **without** clearing its text.
- **Live region:** a visually-hidden `aria-live="polite"` region announces the result count once the debounced query resolves.
- **No matches:** distinct copy from the loading state; matching is case-insensitive substring only, no typo tolerance, so the empty-state copy should read like "no results — check the spelling," not imply fuzzy/semantic search.
- **Results page:** shows the count, a sort control (Relevance / Price: Low to High / Price: High to Low), a grid of `ProductCard`s (16 per page), and pagination. Changing `sort` or `page` updates the URL and the grid, same pattern as the collection page's `SortControl`. No query (`/search` with no `q`) and a query with zero matches are distinct, visible states.
- **Direct link / reload:** `/search?q=jacket&sort=price-asc&page=2` renders the same result set the URL describes; an invalid `sort` or out-of-range `page` falls back rather than erroring.
- No GraphQL requests from the results page happen in the browser. The combobox is the one exception: it is the deliberate, sole remaining reason `ApolloWrapper` stays in the tree (see Technical).

## Technical

- **Answers the open question `apollo-nextjs.md` decision 4 and `cart.md` risk 5 both left dangling.** `ApolloWrapper` stays — for the predictive combobox only. Nothing else in the app uses client Apollo.
- **Why not a Server Action for the combobox:** Server Actions dispatch one at a time per client (verified, Next.js bundled docs). A predictive-search action would share the cart's dispatch queue, so a search keystroke could delay, or be delayed by, a cart mutation from the same tab. `useLazyQuery` has no such coupling.
- **Why not a Route Handler:** CORS already lets the browser call mock.shop directly, so a handler would be a same-origin proxy re-implementing typed documents, caching and cancellation Apollo already provides for free.
- **Pagination is JS-side, not GraphQL cursor-based.** `search(first: 250)` returns the whole matching set for this catalog (30 products total), so `paginate()` slices the array by `?page=`. This is deliberately the same shape as the collection page, not "real" pagination — documented as a risk, revisit only if the catalog grows past ~250 products.
- **Caching:** `force-cache` for `getSearchResults`, same reasoning as catalog data — search text isn't per-visitor. Accepted trade-off: one Next data-cache entry per distinct search string, an in-memory LRU with no persistence, so this is a memory-shape note, not a correctness concern.
- **Debounce is 300 ms**, matching the cart stepper's existing constant — reuse the convention, don't invent a second number.
- Follow existing patterns: Zod parsing that never throws (facets convention), pure functions in `src/lib/search/`, `ProductCard` fragment reuse, `VisuallyHidden` atom for the live region.

## UI

- Reference the header/search screenshots in `context/screenshots/` (direction only).
- Combobox: input `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`; results `<ul role="listbox">` with `<li role="option" aria-selected>`.
- Touch targets ≥44px on combobox options, sort control, pagination controls.
- Focus-visible via the existing token. `Escape` returns focus to the input, doesn't clear it.
- Results page states (loading, no query, no matches, populated) are communicated with text, not layout alone.

## Testing

- **Unit — `src/lib/search/` (counts toward the ≥80% gate):** `params.test.ts` (missing/invalid `sort` falls back to relevance; `page` of `0`, `-1`, `"abc"`, very large all clamp to something renderable; `q` trimmed). `paginate.test.ts` (empty input, exact page boundary, last partial page, `page` beyond `totalPages` clamps down, `page` below 1 clamps up). `sort.test.ts` mirrors `facets/sort.test.ts`.
- **Unit — `src/hooks/`:** `useDebouncedValue` with `vi.useFakeTimers()` — no update before the delay, updates after, a rapid sequence only commits the last value.
- **Component (RTL + MSW):** typing below `MIN_QUERY_LENGTH` fires no query; typing more and waiting the debounce fires exactly one; arrow keys move `aria-activedescendant`; `Enter` on an active option navigates; `Enter` with nothing active submits to `/search?q=`; `Escape` closes without clearing; live region announces the result count; loading and zero-result states render distinct copy.
- **Required — the `Search` union regression test (decision 3).** A `.server.test.ts` for `getSearchResults`, same shape as `src/lib/cart/fetchers.server.test.ts`, running the real `SearchDocument` through the real RSC Apollo client (MSW at the network boundary) and asserting the mapped `ProductCard` fields are non-empty — not just that a fixture-driven mapper test produces the right shape. This exists because a missing `possibleTypes` entry for an abstract type (here, the `SearchResultItem` union) fails silently: fields quietly drop to `__typename`-only with no error and no failing mapper test, as `BaseCartLine` already taught this project. Don't skip this on the reasoning that no fragment is defined directly on the union — that same reasoning didn't hold for the cart.
- **`generateMetadata`:** asserts `robots: { index: false }` and a query-reflecting title.
- **Storybook + a11y addon:** `SearchCombobox` stories (empty, loading, populated, no-results).
- **E2E (Playwright, real API, per project convention):** type → see suggestions → arrow to one → `Enter` → lands on product page. Type a no-match term → results page no-results state. Type → `Enter` directly → results page shows count and sort control. Change `sort`/`page` → URL and grid update. Axe on the open combobox (with results and empty) and on the results page (with results, no query, no matches).

## Out of Scope

- Fuzzy/typo-tolerant matching, "did you mean" suggestions, or trending searches — `predictiveSearch.queries` is always empty on mock.shop and shouldn't be built around.
- GraphQL cursor-based pagination — revisit only if the catalog grows past ~250 products.
- Searching articles or pages — `types: PRODUCT` only, per the verified union shape.
- Removing `ApolloWrapper` — it now has exactly one job (the combobox); don't add a second client-Apollo consumer without a reason as strong as this one.

## Notes

- Source of truth: `docs/predictive-search.md` (decisions 1–3, verified API facts, code sketches). Prior research: `docs/apollo-nextjs.md` (decision 4), `docs/cart.md` (risk 5).
- Decisions: (1) `MIN_QUERY_LENGTH = 2`, `SEARCH_PAGE_SIZE = 16`, `predictiveSearch limit = 6`, debounce 300 ms — all approved as-is; (2) `force-cache` cache growth accepted (in-memory LRU, no persistence); (3) the `Search` union regression test is required, not optional.
- `search.productFilters` was not independently probed this round; assumed empty like `collection.productFilters` (verified elsewhere). Worth a one-off check before relying on it, per risk 8.
- No new dependencies expected — `@apollo/client` and its hooks are already installed.

## Verify first

1. Confirm Apollo Client 4's auto-abort behavior with a component test before trusting it in the combobox: a rapid sequence of keystrokes must result in the last query's results being shown, not an earlier one that happened to resolve later (research verified this against docs, not yet against real code).
2. One-off check that `search.productFilters` is ignored the same way `collection.productFilters` is, before assuming it (risk 8).
