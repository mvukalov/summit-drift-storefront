# Collection Page Spec

## Overview

Build `/collections/[handle]`: the product grid for one collection, with sort (URL state) and the SEO/JSON-LD requirements from `project-overview.md` §5.5. **No facets/filters here** — the README splits that out as its own `facets` feature (phase 1 logic, phase 2 UI) right after this one; this feature is deliberately just "grid + sort", per the README's own description. The filter sidebar visible in `context/screenshots/plp-*.png` is `facets`' job, not this one's.

## Requirements

- `src/app/collections/[handle]/page.tsx`: Server Component, uses `getCollection(handle, sort)` (existing fetcher from `graphql-layer`, extended with sort).
- Unknown handle → `notFound()` (the fetcher already returns `null` for this case).
- Sort control: "Featured" (default, collection's own order), "Price: Low to High", "Price: High to Low", "Best Selling" — mapped to `ProductCollectionSortKeys` (`COLLECTION_DEFAULT`, `PRICE`/`PRICE` reverse, `BEST_SELLING`), all confirmed working on mock.shop (`project-overview.md`'s capabilities table).
- Sort lives in the URL (`?sort=price-asc`, etc.), Zod-validated, defaulting to `featured` when absent — same principle §5.1 describes for facets, sort gets it first since it ships first.
- `generateMetadata` sets `alternates.canonical` to the clean `/collections/[handle]` URL (no `?sort=`) — §5.5's canonical rule, needed as soon as any query param can vary the page.
- `BreadcrumbList` JSON-LD (Home → collection title) via a new, dedicated `JsonLd` component (`coding-standards.md` §Security: one component, escapes `<` in the serialized output).
- Product count text (e.g. "8 products").
- `loading.tsx`, `error.tsx` for this route; a root `src/app/not-found.tsx` (first feature that needs one — reusable later by `product-page`).

## Expected Behavior

- Normal: collection title + description, product count, sort control, grid of `ProductCard`s (reused from `home-page`).
- Empty collection (0 products): an empty-state message, not a blank grid — `project-overview.md` §8 requires this even though no real collection is empty today.
- Unknown handle (e.g. `/collections/does-not-exist`): 404 via `not-found.tsx`, not a crash or empty grid.
- Changing sort updates the URL and the grid re-renders server-side with the new order (no client-side re-sorting of already-fetched data).
- Canonical tag always points at the plain collection URL regardless of the current sort.

## Technical

- Extend `src/lib/graphql/documents/collection.graphql`'s `CollectionByHandle` query with `$sortKey: ProductCollectionSortKeys`, `$reverse: Boolean` on the `products(...)` field (keep `first: 250`, unchanged from `graphql-layer`).
- Extend `getCollection(handle: string, sort?: SortOption)` in `src/lib/catalog/fetchers.ts` — same shape, same "unknown handle → null" behavior.
- New `src/lib/facets/sort.ts`: `parseSortParam` (Zod-validated search param → `SortOption`), `serializeSortParam`, and the `SortOption → { sortKey, reverse }` GraphQL variable mapping. This is placed in `src/lib/facets/` (not `src/lib/catalog/`) on purpose — `project-overview.md` §6 already names that folder for "derive / apply / URL (de)serialize" URL-state logic, and sort is the first piece of it; `facets` will add the rest next to it, not create a new folder.
- New `Select` atom (`src/components/atoms/Select/`): a thin, token-styled wrapper around a native `<select>` (visual language matching `Input`), for accessibility/keyboard-for-free. First consumer is collection sort; `facets`' filter UI (phase 2) and `search`'s results sort are likely near-term second consumers, which is why it's an atom now rather than route-local.
- Sort control itself (`<select>` + the URL-navigation wiring via `useRouter`/`useSearchParams`) stays **local** to `src/app/collections/[handle]/` (a small Client Component), not a shared molecule — `facets` will likely redesign this whole toolbar when it adds filter chips alongside sort, so don't build a shared abstraction for one caller yet.
- New `src/components/atoms/JsonLd/JsonLd.tsx` (or a small utility, Claude Code's call on atom vs. lib-only): renders one `<script type="application/ld+json">` from a given object, `JSON.stringify` with `<` escaped to `<` per `coding-standards.md`.
- `not-found.tsx` at the app root: a simple message + link back to `/`.

## UI

- Reference `context/screenshots/plp-desktop-1.png`/`-2.png`, `plp-mobile-1.png` — **only the header, title, product count, sort control and grid are in scope**; the left-column filters, filter chips ("Moss ×", "Size M ×", "On sale ×"), and the "Products / Loading / No results" state switcher visible in the mockup belong to `facets` or are Lovable-prototype UI, not this feature.
- Grid: same 2→4 column pattern as `home-page`'s Featured grid, same `ProductCard` component, same `sizes` string.
- Sort control accessible via keyboard, labeled ("Sort:" + visible or `VisuallyHidden` label depending on how `Select` ends up designed).
- Touch targets ≥44px on the sort control.

## Testing

- **Unit:** `parseSortParam`/`serializeSortParam` (`src/lib/facets/sort.test.ts`) — valid values, invalid/missing → `featured` default. `getCollection` with sort variables (MSW) — confirm the right `sortKey`/`reverse` go out for each `SortOption`, plus the existing unknown-handle → `null` case still holds.
- **Component (RTL):** page renders the grid from mocked data; empty collection shows the empty state; changing the sort `<select>` navigates with the right `?sort=` value (mock `useRouter`).
- **`generateMetadata`:** call it directly with a mock handle + a `?sort=price-asc` searchParams and assert `alternates.canonical` has no query string.
- **`JsonLd`:** asserts `<` is escaped in the rendered script content, and the object serializes correctly.
- **`not-found.tsx`:** render test.
- **Storybook + a11y addon:** `Select` atom (default, focus, disabled), `JsonLd` doesn't need a story (no visual output).
- No E2E yet — `e2e-and-a11y`.

## Out of Scope

- Any facet/filter UI or logic (color, size, price range, "on sale only") — `facets`, next feature.
- Filter chips, "Clear all".
- Pagination beyond the existing `first: 250` (documented limit, per §5.1).
- Product structured data (`Product` JSON-LD) — that's `product-page`; only `BreadcrumbList` here.

## Notes

- `src/lib/facets/` is created by this feature, ahead of the `facets` feature itself, specifically for sort's URL-state logic — this is intentional, not scope creep; flag it if `facets`' own spec needs to reconcile file ownership.
- `Select` atom is a judgment call similar to `ProductImage` in `home-page`: built as a shared atom in anticipation of `facets` (phase 2) and `search` needing the same control shortly, rather than waiting for a second concrete consumer to exist first.
- Sort control is intentionally route-local, not a molecule — expect `facets` to revisit/expand this toolbar rather than treating today's version as final.
