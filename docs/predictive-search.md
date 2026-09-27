# Predictive Search & Search Results

> Research for `context/research/predictive-search.md`. Done on 2026-09-27 against Next.js
> 16.3.5, React 19.2.8, `@apollo/client` 4.3.1 (installed), and the live mock.shop API that day.
> **Verified** = seen in bundled docs, Context7, or a live API response. **Assumption** = not
> executed against real code yet; confirm during implementation.

## Recommendation

**Results page (`/search?q=`):** fetch it exactly the way the collection page fetches a
collection — one RSC request for everything that matches, then work with the array in pure
functions. `search(query, first: 250, types: PRODUCT, sortKey, reverse)` returns the whole
catalog for a broad term (verified: `query: "e"` matches all 30 products), so there is no real
pagination problem to solve against the API — only a display one. A new `getSearchResults()` in
`src/lib/catalog/fetchers.ts` fetches once with `force-cache` (search text isn't per-visitor, so
the same caching model as the rest of the catalog applies), and a pure `paginate()` in
`src/lib/search/` slices the result by a `page` search param. `q`, `sort` and `page` are already
reserved names in `src/lib/facets/url.ts`'s `RESERVED_PARAMS` — a past decision this feature can
just pick up. `generateMetadata` sets `robots: { index: false }` (project overview §5.5); no
canonical is needed once the page is noindexed.

**Predictive combobox in the header:** a client component using `useLazyQuery` from
`@apollo/client/react` against a new `PredictiveSearch` document, through the existing
`ApolloWrapper`. This is the one thing that keeps the client-side Apollo cache load-bearing —
both `apollo-nextjs.md` (decision 4) and `cart.md` (risk 5) left this as the open question the
search feature had to answer, and the answer is: **yes, keep it**, for exactly the use case it
was reserved for. The reason to prefer this over rolling a fetch-based solution: **Apollo Client
4 aborts a `useLazyQuery` execution outright when a new one starts before the previous resolves**
(verified via Context7, Apollo's 4.x migration notes) — the exact "stale-response race" the
research brief asks about, solved by the library instead of by hand-written request-id
tracking or `AbortController` plumbing. Debounce the _keystroke_ (300ms, matching the cart
stepper's existing convention) with a small `useDebouncedValue` hook so a fast typist doesn't
fire ten requests; Apollo's cancellation is the backstop for whatever slips past that.

**Reject Server Actions for the combobox.** Next.js dispatches Server Actions **one at a time
per client** (verified, bundled docs, `server-actions.md`): "if a user triggers three actions in
quick succession, the second waits for the first to finish." A predictive-search action sitting
in that same per-client queue would delay — or be delayed by — a cart mutation dispatched from
the same tab. That coupling is a real cost for a read-only typeahead and has no comparable
benefit; a Server Action buys nothing here that `useLazyQuery` doesn't already give for free.
**Reject a Route Handler too**, for a smaller reason: CORS already lets the browser call
mock.shop directly (verified, `apollo-nextjs.md`), so a handler would just be a same-origin proxy
that re-implements typed documents, caching and cancellation Apollo already provides.

## Decisions

Made by the project architect on 2026-09-27. These replace the matching options under "Risks /
open questions" and any snippet above that says otherwise. They are carried into the
predictive-search feature spec.

1. **The four proposed numbers: approved as-is.** `MIN_QUERY_LENGTH = 2`, `SEARCH_PAGE_SIZE =
16`, `predictiveSearch` `limit = 6`, debounce `= 300ms`. None come from the API or the
   framework — see risk 6 for why each was chosen — and none need revisiting unless real usage
   says otherwise.
2. **Cache growth from `force-cache`: accepted.** One Next data-cache entry per distinct search
   string is fine — the runtime cache is an in-memory LRU with no persistence (risk 1), so this
   is a memory-shape note, not a correctness concern, and not worth a `no-store` opt-out.
3. **A regression test for the `Search` union is required, not optional.** The cart's
   `BaseCartLine` fragment taught this project that a missing `possibleTypes` entry for an
   abstract type fails **silently** — fields quietly drop to `__typename`-only, no error, no
   failing mapper test, because mapper tests call the mapper directly and never touch the
   normalized cache (`apollo-nextjs.md`, "Learned in use"). The reasoning in risk 3 (no fragment
   is defined directly on the `SearchResultItem` union, so `POSSIBLE_TYPES` shouldn't need an
   entry for it) is not enough on its own after that lesson. The `Search` component/fetcher test
   must assert that a `Product` result's fields actually arrive through the real `InMemoryCache`
   — not just that the mapper produces the right shape from a fixture — so the failure mode
   stays visible if the reasoning turns out to be wrong.

## Alternatives and trade-offs

### Predictive combobox transport

| Option                                             | Pros                                                                                                                 | Cons                                                                                                             | Verdict                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Client Apollo `useLazyQuery`** (recommended)     | Typed via codegen; auto-cancels superseded requests (verified, Apollo 4); reuses `ApolloWrapper` already in the tree | Package is 0.x/4.x and still settling (noted in `apollo-nextjs.md`); browser bundle already pays for it          | **Recommended** — answers the open question left by two prior docs |
| Server Action (`"use server"`)                     | Fits the project's existing Server Action pattern for the cart                                                       | Shares the cart's per-client sequential dispatch queue (verified) — a search keystroke can block a cart click    | Rejected                                                           |
| Route Handler + `fetch`/`AbortController`          | Full manual control; no Apollo dependency in the path                                                                | Re-implements typed documents and cancellation Apollo already does; CORS makes the proxy pointless (verified)    | Rejected                                                           |
| Plain client `fetch` (no Apollo, no Route Handler) | Smallest code path                                                                                                   | Hand-rolled `AbortController` bookkeeping per keystroke; no typed documents; still needs the same debounce logic | Rejected                                                           |

### Results page pagination

| Option                                                                  | Pros                                                                                                      | Cons                                                                                                                           | Verdict                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Fetch once (`first: 250`), paginate in JS by `?page=`** (recommended) | Matches the collection page's own pattern; `q`/`page` are already reserved params; one request, cacheable | Not a real solution past ~250 matches — but neither is the collection page, and it's documented                                | **Recommended**                                                         |
| GraphQL cursor pagination (`first`/`after` in the URL)                  | "Correct" for an unbounded catalog                                                                        | The catalog has 30 products total; cursors are opaque and don't compose with a `sort` change as cleanly as a plain page number | Rejected for this catalog size — revisit if the catalog grows past ~250 |

### Results page caching model

| Option                                       | Pros                                                                                                                                | Cons                                                                                                                      | Verdict                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **`force-cache` (the RSC client's default)** | Search text isn't per-visitor; identical queries reuse the entry (cache key includes the POST body, verified in `apollo-nextjs.md`) | Every distinct query string gets its own cache entry — unbounded for free text, though the LRU is in-memory and ephemeral | **Recommended**, flagged as a risk below |
| `no-store` (like the cart)                   | No cache growth concern                                                                                                             | No reason to opt out — nothing here is per-visitor                                                                        | Rejected                                 |

## Verified facts

### Live API (`https://apparel-outdoor.mock.shop/api`, 2026-09-27)

| #   | Behaviour                         | Observed                                                                                                                                                                                                  |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Matching                          | Case-insensitive **substring** match, no typo tolerance: `"JACKET"` and `"jack"` both match 7 products; `"jaket"` matches 0                                                                               |
| 2   | Single-character query            | Works, not rejected: `"j"` → 14 results, `"a"` → all 30                                                                                                                                                   |
| 3   | Empty / whitespace query          | `totalCount: 0`, no error                                                                                                                                                                                 |
| 4   | Injection safety                  | A query string like `jacket" OR title:*` is passed as a GraphQL variable, matches nothing literally — no syntax is parsed                                                                                 |
| 5   | `search.edges.node` type          | **Union** `SearchResultItem` = `Article \| Page \| Product` (verified via introspection) — needs `... on Product { }`                                                                                     |
| 6   | `search` sort keys                | Enum `SearchSortKeys`: only `PRICE` and `RELEVANCE` (no `BEST_SELLING`/`CREATED` like collections)                                                                                                        |
| 7   | `search` pagination               | Full `first`/`after`/`last`/`before` cursor support, `totalCount`, `pageInfo` — all standard Relay-style                                                                                                  |
| 8   | `search.productFilters`           | Ignored as input and empty as output, like collections — checked during implementation, see risk 8                                                                                                        |
| 9   | `prefix` argument (`NONE`/`LAST`) | **No observable effect** on mock.shop: identical `totalCount` for a partial term either way                                                                                                               |
| 10  | `predictiveSearch.products`       | A plain `[Product!]!` list — **not** a union, so `...ProductCard` applies directly, no inline fragment needed                                                                                             |
| 11  | `predictiveSearch` other fields   | `collections`, `articles`, `pages` always empty for this catalog (expected — no blog/pages seeded); `queries` (term suggestions) is **always empty**, even for common prefixes — don't build UI around it |
| 12  | `predictiveSearch.limit`          | Server-enforced range: `limit: 0` → GraphQL error `"limit must be between 1 and 10"`; default (omitted) is **10**                                                                                         |
| 13  | `predictiveSearch` cost           | 2–5 `requestedQueryCost` per call in testing — cheap enough for one call per debounced keystroke                                                                                                          |
| 14  | Unavailable products              | Not separately tested here; the catalog already has 0/360 unavailable variants (project overview §2), so this path stays synthetic like the PDP's                                                         |

### Apollo Client 4 (Context7 `/apollographql/apollo-client`)

- **`useLazyQuery`'s `execute()` aborts the previous in-flight call** when invoked again before
  it resolves, and when the component unmounts. The superseded promise rejects with
  `AbortError`. This is new behavior in Apollo Client 4 (verified via the 4.x migration guide),
  and it is exactly the guarantee a debounced typeahead needs.
- Apollo Client **swallows the unhandled rejection** from an aborted call's promise by default —
  "aborted errors are silent" unless you attach your own rejection handler. A component that only
  reads the hook's `result` (not the returned promise) needs no `try/catch` around `execute()`.
  The hook's `result` state itself only ever reflects the **latest** call, so a stale response
  arriving late cannot overwrite a newer one in the UI.
- `useLazyQuery`'s aborted-request behavior is 4.x-specific and doc-verified, not yet
  execution-verified in this repo (no code exists yet) — confirm once the combobox is built.

### Next.js 16.3.5 (bundled docs, `node_modules/next/dist/docs/`)

- **Server Actions dispatch sequentially per client** (`02-guides/server-actions.md`): "Next.js
  dispatches Server Actions one at a time per client... do not rely on `Promise.all` to
  parallelize Server Actions." This is the concrete reason a predictive-search action would
  contend with cart actions from the same tab.
- Route Handlers (`01-getting-started/15-route-handlers.md`) are POST/GET endpoints outside the
  Server Action dispatch queue and support the Web `Request`/`Response` API directly, including
  `AbortSignal` from the client — the standard shape if a Route Handler were ever needed, which
  it isn't here.
- Per-page `Metadata.robots` (`03-api-reference/04-functions/generate-metadata.md`): `robots: {
index: false, follow: true }` renders `<meta name="robots" content="noindex, follow">`. This is
  the mechanism for §5.5's "search result pages are noindex," distinct from the site-wide
  `app/robots.ts` file.

## Implementation outline

### Files

```
src/lib/graphql/documents/
  search.graphql              Search, PredictiveSearch
src/lib/search/
  params.ts                   parseSearchParams: q, sort, page — zod, mirrors facets/sort.ts
  params.test.ts
  sort.ts                     SEARCH_SORT_OPTIONS (relevance/price-asc/price-desc) → SearchSortKeys/reverse
  sort.test.ts
  paginate.ts                 pure: slice a ProductCard[] by page/PAGE_SIZE
  paginate.test.ts
src/lib/catalog/fetchers.ts   + getSearchResults(query, sort)
src/hooks/
  useDebouncedValue.ts
  useDebouncedValue.test.ts
src/components/molecules/SearchCombobox/
  SearchCombobox.tsx           'use client'
  SearchCombobox.module.scss
  SearchCombobox.test.tsx
  SearchCombobox.stories.tsx
src/app/search/
  page.tsx
  loading.tsx
  error.tsx
  page.test.tsx
src/components/organisms/Header/Header.tsx   mount SearchCombobox next to CartTrigger
src/test/msw/fixtures/search.ts, predictiveSearch.ts
src/test/msw/handlers.ts     + SearchDocument, PredictiveSearchDocument handlers
```

`src/lib/facets/url.ts` already reserves `"q"` and `"page"` in `RESERVED_PARAMS` — no change
needed there.

### 1. Documents

```graphql
# src/lib/graphql/documents/search.graphql

query Search($query: String!, $first: Int!, $sortKey: SearchSortKeys, $reverse: Boolean) {
  search(query: $query, first: $first, types: PRODUCT, sortKey: $sortKey, reverse: $reverse) {
    totalCount
    edges {
      node {
        ... on Product {
          ...ProductCard
        }
      }
    }
  }
}

# limit is capped 1-10 server-side (verified); 6 fits a dropdown without scrolling.
query PredictiveSearch($query: String!, $limit: Int!) {
  predictiveSearch(query: $query, limit: $limit, types: [PRODUCT]) {
    products {
      ...ProductCard
    }
  }
}
```

Run `npm run codegen` after adding this file, per the standing rule.

### 2. `src/lib/search/sort.ts` — same shape as `facets/sort.ts`

```ts
import { z } from "zod";
import type { SearchSortKeys } from "@/lib/graphql/generated/graphql";

export const SEARCH_SORT_PARAM = "sort";

export const SEARCH_SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
] as const;

export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number]["value"];
export const DEFAULT_SEARCH_SORT: SearchSortOption = "relevance";

export interface SearchSortVariables {
  sortKey: SearchSortKeys;
  reverse: boolean;
}

const SEARCH_SORT_VARIABLES: Record<SearchSortOption, SearchSortVariables> = {
  relevance: { sortKey: "RELEVANCE", reverse: false },
  "price-asc": { sortKey: "PRICE", reverse: false },
  "price-desc": { sortKey: "PRICE", reverse: true },
};

const schema = z.enum(SEARCH_SORT_OPTIONS.map((o) => o.value)).catch(DEFAULT_SEARCH_SORT);

export function parseSearchSortParam(value: string | string[] | undefined): SearchSortOption {
  return schema.parse(value);
}

export function toSearchSortVariables(sort: SearchSortOption): SearchSortVariables {
  return SEARCH_SORT_VARIABLES[sort];
}
```

### 3. `src/lib/search/params.ts`

```ts
import { z } from "zod";
import { DEFAULT_SEARCH_SORT, parseSearchSortParam, type SearchSortOption } from "./sort";

const qSchema = z
  .string()
  .trim()
  .max(200) // defensive; not verified against the API, which accepts arbitrary length
  .catch("");

const pageSchema = z.coerce.number().int().min(1).catch(1);

export interface SearchParams {
  q: string;
  sort: SearchSortOption;
  page: number;
}

/** Mirrors `parseSortParam`/`parseFacetsParam`: never throws, a bad URL still renders a page. */
export function parseSearchParams(params: {
  q?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}): SearchParams {
  const q = Array.isArray(params.q) ? params.q.at(-1) : params.q;
  const page = Array.isArray(params.page) ? params.page.at(-1) : params.page;
  return {
    q: qSchema.parse(q ?? ""),
    sort: parseSearchSortParam(params.sort as string | undefined) ?? DEFAULT_SEARCH_SORT,
    page: pageSchema.parse(page),
  };
}
```

### 4. `src/lib/search/paginate.ts`

```ts
export const SEARCH_PAGE_SIZE = 16; // 4 rows at the grid's 4-column breakpoint

export interface Paginated<T> {
  items: T[];
  /** Clamped to `[1, totalPages]` — an out-of-range `?page=` still renders something. */
  page: number;
  totalPages: number;
}

export function paginate<T>(items: T[], page: number, pageSize = SEARCH_PAGE_SIZE): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const start = (clampedPage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: clampedPage, totalPages };
}
```

### 5. `getSearchResults` — `src/lib/catalog/fetchers.ts`

```ts
export async function getSearchResults(
  searchQuery: string,
  sort: SearchSortOption = DEFAULT_SEARCH_SORT,
): Promise<{ products: ProductCard[]; totalCount: number }> {
  // Verified: the API returns an empty result for "" anyway; skipping the call avoids a
  // wasted round trip when someone visits `/search` with no query.
  if (!searchQuery) return { products: [], totalCount: 0 };

  const { data } = await query({
    query: SearchDocument,
    variables: { query: searchQuery, first: 250, ...toSearchSortVariables(sort) },
  });
  if (!data) {
    throw new Error("Search query returned no data");
  }
  return {
    products: data.search.edges.map((edge) => toProductCard(edge.node)),
    totalCount: data.search.totalCount,
  };
}
```

`toProductCard` already exists and needs no change: `edge.node` narrows to the `Product` arm of
the inline fragment, which has the same shape `CollectionByHandle`'s `products.nodes` do.

### 6. `src/app/search/page.tsx`

```tsx
export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const { q } = parseSearchParams(await searchParams);
  return {
    title: q ? `Search results for "${q}"` : "Search",
    // §5.5: search result pages are noindex — many query strings, no canonical identity.
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q, sort, page } = parseSearchParams(await searchParams);
  const { products, totalCount } = await getSearchResults(q, sort);
  const { items, page: currentPage, totalPages } = paginate(products, page);
  // ...render count, sort control, grid (reuse ProductCard), pagination, empty/no-query states
}
```

### 7. `useDebouncedValue`

```ts
// src/hooks/useDebouncedValue.ts
"use client";
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
```

Standard debounce-by-effect; `vi.useFakeTimers()` covers it in tests per the coding standards.

### 8. `SearchCombobox` — WAI-ARIA "list autocomplete" combobox

The APG list-autocomplete pattern (no inline text completion — this matches how the results
behave, since typing doesn't complete the input's own text):

- Input: `role="combobox"`, `aria-expanded`, `aria-controls={listboxId}`,
  `aria-activedescendant={activeOptionId | undefined}`, `aria-autocomplete="list"`.
- Results: `<ul role="listbox" id={listboxId}>`, each result `<li role="option" id={...}
aria-selected={isActive}>`.
- A visually-hidden `aria-live="polite"` region (reuse the existing `VisuallyHidden` atom)
  announcing `"{n} results"` after the debounced query resolves.
- Keyboard: `ArrowDown`/`ArrowUp` move `activeIndex` (wrapping or clamping — pick one and test
  it); `Enter` on an active option navigates to the product; `Enter` with no active option, or
  the form's own submit, does `router.push(`/search?q=${encodeURIComponent(value)}`)`; `Escape`
  closes the listbox and returns focus to the input without clearing its text (APG: distinct
  from clearing).

```tsx
"use client";
import { useLazyQuery } from "@apollo/client/react";
import { PredictiveSearchDocument } from "@/lib/graphql/generated/graphql";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const MIN_QUERY_LENGTH = 2; // UI choice, not an API limit (the API accepts 1 char)
const PREDICTIVE_LIMIT = 6;
const DEBOUNCE_MS = 300;

// ...
const [inputValue, setInputValue] = useState("");
const debouncedQuery = useDebouncedValue(inputValue, DEBOUNCE_MS);
const [runPredictive, { data, loading }] = useLazyQuery(PredictiveSearchDocument);

useEffect(() => {
  if (debouncedQuery.trim().length < MIN_QUERY_LENGTH) return;
  // Apollo Client 4 aborts any still-pending call from here automatically, and swallows the
  // resulting rejection — no manual cancellation or try/catch needed (verified, Apollo docs).
  runPredictive({ variables: { query: debouncedQuery, limit: PREDICTIVE_LIMIT } });
}, [debouncedQuery, runPredictive]);
```

### 9. Header

Mount `<SearchCombobox />` in `Header.tsx` next to `CartTrigger`/`MobileNav` — a third client
leaf alongside two existing ones, same composition pattern already in place.

## Testing strategy

- **Unit (`src/lib/search/`, counts toward the ≥80% gate):** `params.test.ts` — missing/invalid
  `sort` falls back to `relevance`; `page` of `0`, `-1`, `"abc"`, and very large values all clamp
  to something renderable; `q` trims whitespace. `paginate.test.ts` — empty input, an exact page
  boundary, a last partial page, `page` beyond `totalPages` clamps down, `page` below 1 clamps up
  to 1. `sort.test.ts` mirrors `facets/sort.test.ts`.
- **Unit (`src/hooks/`):** `useDebouncedValue` with `vi.useFakeTimers()` — value doesn't update
  before the delay, updates after, and a rapid sequence of updates only commits the last one.
- **Component (RTL + MSW):** a new `shop.query(PredictiveSearchDocument, ({ variables }) =>
...)` handler keyed by `variables.query`, following the existing `variables.handle`-keyed
  pattern in `handlers.ts`. Cases: typing below `MIN_QUERY_LENGTH` fires no query; typing more
  and waiting the debounce fires exactly one; `ArrowDown`/`ArrowUp` move
  `aria-activedescendant`; `Enter` on an active option navigates (assert `router.push` or the
  resulting link); `Enter` with nothing active submits to `/search?q=`; `Escape` closes without
  clearing the input; the live region's text updates with the result count; loading and
  zero-result states render distinct copy.
- **Required by decision 3 — the `Search` union regression test.** A `.server.test.ts` for
  `getSearchResults` that runs the real `SearchDocument` through the real RSC Apollo client
  (MSW at the network boundary, matching the existing `server-only` test setup) and asserts the
  mapped `ProductCard` fields are non-empty — `title`, `options`, `price`, not just
  `__typename`. This is the same shape as `src/lib/cart/fetchers.server.test.ts`, which exists
  specifically to keep the `BaseCartLine`/`possibleTypes` failure mode visible; this test
  applies that lesson to the `SearchResultItem` union before any bug proves it necessary.
- **E2E (Playwright, real API per the project's convention):** type → see suggestions → arrow to
  one → `Enter` → lands on the product page; type a term with no matches → results page shows the
  no-results state; type → `Enter` directly → results page shows the count and the sort control;
  change `page`/`sort` and confirm the URL and grid update; axe on the open combobox (with
  results and empty) and on the results page (with results, no query, and no matches).

## Risks / open questions

1. **Decided (see Decisions 2): accepted.** `force-cache` gives every distinct search string its
   own Next data-cache entry (cache key includes the POST body, per `apollo-nextjs.md`). The
   runtime cache is an in-memory LRU with no persistence, so this is a memory-shape concern, not
   a correctness one — the same way `apollo-nextjs.md` accepted it for catalog data.
2. **Resolved during implementation (2026-09-27): Apollo 4's auto-abort holds in this repo.**
   `SearchCombobox.test.tsx` fires "ja" then "jacket", holds "ja" open, and asserts that its
   request's `AbortSignal` is aborted once "jacket" starts. It then releases "ja" with a
   different (empty) answer after "jacket"'s results are on screen, and asserts the combobox
   does not flip to "No results".
3. **Decided (see Decisions 3): a regression test is required, not optional.** `Search.edges.node`
   is a union (`SearchResultItem`); `PredictiveSearch.products` is not. The plan never defines a
   fragment directly on the union (only `...ProductCard` inside `... on Product`), which
   _should_ mean it doesn't need the `possibleTypes` cache trap `apollo-nextjs.md` documented for
   the cart's `BaseCartLine` fragment — but that failure mode was **silent** (fields quietly drop
   to nothing, no error, no failing mapper test), so the reasoning alone isn't trusted. See the
   testing strategy's "`Search` union regression test."
4. **`predictiveSearch.queries` is always empty on mock.shop.** Don't build "did you mean" or
   trending-search UI around it; it may light up against a real Shopify store later.
5. **No typo tolerance, substring-only matching (verified).** The empty-state copy should read
   like "no results — check the spelling" rather than implying semantic or fuzzy search.
6. **Decided (see Decisions 1): approved as proposed.** `MIN_QUERY_LENGTH` (2),
   `SEARCH_PAGE_SIZE` (16), `predictiveSearch` `limit` (6), and the debounce delay (300ms, chosen
   to match the cart stepper's existing constant). None come from the API or the framework —
   they were UX judgment calls, now confirmed.
7. **Long or unusual query strings are untested against the live API.** The `.max(200)` in
   `qSchema` is defensive, not a verified server limit.
8. **Resolved during implementation (2026-09-27): `search` ignores `productFilters` too.**
   `query: "jacket"` with `productFilters: [{ price: { max: 50 } }]` still returned all 7
   jackets (cheapest $75), and `[{ available: false }]` also returned all 7 although no variant
   is unavailable. The connection's own `productFilters` facet list is `[]`. Same behaviour as
   collections, so any future search facets would have to be derived in `src/lib/facets/`.

## Sources

- **Live API**, `https://apparel-outdoor.mock.shop/api`, 2026-09-27 — ~20 probes: `search` and
  `predictiveSearch` with basic/empty/whitespace/typo/case/single-character/injection queries,
  sort-key comparison, pagination cursors, `limit` bounds, `prefix` argument, and introspection
  of `SearchSortKeys`, `SearchType`, `PredictiveSearchType`, `PredictiveSearchLimitScope`,
  `SearchableField`, `SearchUnavailableProductsType`, and the `SearchResultItem` union.
- **Context7 `/apollographql/apollo-client`**: `useLazyQuery` API reference, the Apollo Client 4
  migration notes on aborted in-flight queries and `.retain()`, `useQuery`/`skipToken` reference.
- **Next.js 16.3.5 bundled docs**, `node_modules/next/dist/docs/`:
  `01-app/02-guides/server-actions.md` (sequential per-client dispatch),
  `01-app/01-getting-started/15-route-handlers.md`,
  `01-app/03-api-reference/04-functions/generate-metadata.md` (`robots` field).
- **Codebase**: `src/lib/facets/{sort,url,query}.ts` (the URL-state pattern this reuses),
  `src/app/collections/[handle]/{page,SortControl}.tsx` (fetch-whole-set + `router.push`
  pattern), `src/components/organisms/CartProvider/CartProvider.tsx` (the 300ms debounce
  precedent and the per-client Server Action queuing this document argues against reusing here),
  `src/lib/graphql/config.ts` (`POSSIBLE_TYPES`, the cache trap referenced in risk 3).
- **Prior research**: `docs/apollo-nextjs.md` (decision 4 and its 2026-09-24 reversal note),
  `docs/cart.md` (risk 5, the open question this document answers).
