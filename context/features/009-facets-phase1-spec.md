# Facets — Phase 1 (Logic) Spec

## Overview

First half of the `facets` feature, per the README's own split: derive available filter options from a collection's product data, apply filters to that data, and (de)serialize the selected filters to/from the URL — all pure logic, fully unit-tested, **no UI**. Phase 2 (the filter sidebar from `context/screenshots/plp-*.png`) is a separate feature/spec that consumes what this phase builds. This lives in `src/lib/facets/`, the folder `collection-page` already created for `sort.ts` — this phase adds the rest of what `project-overview.md` §6 describes for that folder ("derive / apply / URL (de)serialize").

## Requirements

- Facet dimensions: **Color** and **Size** (product option values), **Price range** (min/max over the collection's current products), **On sale only** (boolean, `isOnSale` from the existing `ProductCard` domain type) — matching what's visible in `context/screenshots/plp-*.png`'s chips ("Moss ×", "Size M ×", "On sale ×").
- `deriveFacets(products: ProductCard[]): FacetGroups` — inspects the already-fetched product list (the same `first: 250` list `collection-page` fetches) and returns, per dimension, the option values actually present in this collection plus their counts (e.g. `{ value: "Moss", count: 4 }`), the min/max price found, and whether any product `isOnSale`. No new GraphQL query — facets are derived client-side (well, server-side in the RSC) from data already on hand, not via a separate Shopify filters query, pending the verification note below.
- `applyFacets(products: ProductCard[], selected: SelectedFacets): ProductCard[]` — pure filter over the product list: color/size are OR-within-dimension, AND-across-dimensions (standard facet semantics), price range is inclusive bounds, on-sale is a straight `isOnSale` check.
- `parseFacetsParam` / `serializeFacetsParam` in `src/lib/facets/` (new file, e.g. `facets.ts`, alongside the existing `sort.ts`) — Zod-validated URL search params → `SelectedFacets`, and back, following the exact principle `sort.ts` already established for `?sort=`. Multi-value params (color, size) as repeated/comma-separated query values — Claude Code's call, document the choice in the file.
- `SelectedFacets` and `FacetGroups` types added to wherever `SortOption` currently lives (`src/types/` or co-located with `src/lib/facets/`) — match the existing pattern, don't invent a new convention.
- No component, no route change, no `page.tsx` wiring — `collection-page`'s page stays exactly as shipped until phase 2 wires this in.

## Expected Behavior

This phase has no visible behavior — nothing renders differently. Verification is entirely through unit tests:

- `deriveFacets` on a fixed set of mock products returns the exact expected option values, counts, price bounds, and sale flag.
- `applyFacets` narrows correctly for a single filter, for multiple filters across dimensions (AND), for multiple values within one dimension (OR), and returns the full list unchanged when no filters are selected.
- `parseFacetsParam`/`serializeFacetsParam` round-trip correctly; invalid/unknown values are dropped rather than throwing; missing params → no filters selected (same "safe default" principle as `parseSortParam`).

## Technical

- New file `src/lib/facets/facets.ts` (or split `derive.ts`/`apply.ts`/`url.ts` if that reads cleaner — Claude Code's call, `sort.ts` is the precedent for one-file-per-concern in this folder).
- Operates on `ProductCard[]` (the existing domain type from `graphql-layer`/`home-page`) — no new fetcher, no new GraphQL document. This phase doesn't touch `src/lib/catalog/fetchers.ts` at all.
- Color/size values come from `ProductCard`'s existing option data if already present; if `ProductCard` doesn't currently carry per-product option values (check the type — it may only carry what `home-page`'s grid needed), this phase may need to widen the fragment/type to include them. If so, that's a small, additive change to the existing `ProductCard` fragment/mapper, not a new query.
- Keep `deriveFacets`/`applyFacets` pure functions with no framework dependency (no Next.js, no React) — they're straightforward to unit test and phase 2 can call them from a Server Component without adapting anything.

## UI

None. Explicitly out of scope for this phase — see Overview.

## Testing

- **Unit only** (this whole feature is `src/lib/`, counts toward the ≥80% coverage gate): `deriveFacets`, `applyFacets`, `parseFacetsParam`, `serializeFacetsParam` — cover the cases listed under Expected Behavior, plus edge cases (empty product list, a collection with only one color, a price range where min === max).
- No component tests, no Storybook, no E2E — nothing renders in this phase.

## Out of Scope

- Filter sidebar UI, filter chips, "Clear all" — phase 2, its own spec.
- Wiring any of this into `collection-page`'s `page.tsx` — phase 2.
- Server-side/GraphQL-level filtering (Shopify's `Collection.products(filters:)` / `productFilters`) — see Verify first; if that turns out to be the better long-term approach it changes phase 2's design, not this phase's client-side derive/apply logic, which stays useful either way as the fallback/testable core.

## Notes

- This phase intentionally mirrors `sort.ts`'s shape (`parse*`/`serialize*` pair, Zod validation, safe default) so phase 2's URL-state code reads as one consistent system across sort + facets, not two different conventions.
- `src/lib/facets/` was created by `collection-page` specifically to hold this — no folder ownership question here.

## Verify first (unverified in the research)

1. Whether mock.shop's Storefront API actually returns usable `Collection.products.filters` (Shopify's native `productFilters`/`ProductFilter` facet mechanism) — if it does, and reliably, server-side filtering might be the better design for phase 2 (smaller payloads, real counts) instead of client-side `applyFacets` over the full `first: 250` list. This phase's `deriveFacets`/`applyFacets` are written client-side deliberately as the safe, testable default given `project-overview.md`'s capabilities table doesn't confirm this for mock.shop — confirm before phase 2 locks in an approach, don't block phase 1 on it.
2. Whether `ProductCard`'s current fragment/type already carries per-product option values (needed for color/size derivation) — check before writing `deriveFacets`; widen the fragment/mapper if not, per Technical above.
