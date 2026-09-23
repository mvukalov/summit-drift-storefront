# Current Feature: Facets Phase 2 (UI)

## Status

In Progress

## Goals

<!-- Checkable bullet points of what success looks like -->

- [x] Filter UI on `/collections/[handle]` built from `deriveFacets(products)`: Color, Size (and any other option axis the collection has), Price range, "On sale only" — only values present in that collection, with counts
- [x] Selecting/deselecting a value updates the URL via `serializeFacetsParam` (`?color=moss&size=M&sale=1&price=25-200`) and the grid re-renders with `applyFacets`
- [x] Filter chips row above the grid, one per active value, each individually removable
- [x] "Clear all" control, rendered only when at least one filter is active
- [x] Product count text reflects the filtered count, inside an `aria-live="polite"` region
- [x] Distinct empty state for "no products match these filters" (separate from the existing empty-collection state) with a way to clear filters
- [x] Sort control moves into the shared toolbar row with the filter trigger/chips — structural revisit of `collection-page`'s route-local `<select>`
- [x] Desktop: sidebar + grid side by side; mobile: filters behind a trigger (sheet/drawer)
- [x] New molecules `FacetGroup` and `FilterChip`, new organism `FilterSidebar` (+ mobile variant if structurally distinct), with RTL tests and Storybook stories
- [x] `page.tsx` wiring: `deriveFacets` → `parseFacetsParam(searchParams)` → `applyFacets` before rendering the grid; no new client-side data fetching
- [x] Keyboard + screen-reader operable: ≥44px touch targets, existing `--color-focus-ring`, reduced motion on any drawer transition, axe 0 violations

## Notes

<!-- Constraints, decisions, links to specs and research docs -->

- Spec: `context/features/010-facets-phase2-spec.md`
- Phase 1 contract is **fixed**: no changes to `deriveFacets` / `applyFacets` / `parseFacetsParam` / `serializeFacetsParam` (`src/lib/facets/`). If the UI needs something they don't give, that's a bug report against phase 1, not a silent change here.
- Order is settled by the data flow: GraphQL returns the collection already sorted (`sortKey`/`reverse`) → `applyFacets` filters that sorted list → order preserved. Document this.
- mock.shop returns an empty `productFilters`, so server-side filtering stays unavailable; filtering remains client-side/derived per phase 1.
- Mobile drawer: evaluate the native `<dialog>` + `showModal()` pattern already proven in `Header`'s mobile nav (focus trap + Escape) rather than a second modal pattern.
- UI reference: `context/screenshots/plp-desktop-1.png`, `plp-desktop-2.png`, `plp-mobile-1.png` — direction, not pixel spec.
- No new unit tests expected (phase 1 covers the pure logic); this phase is composition + wiring. E2E ("select multiple filters, verify grid and URL") stays deferred to the `e2e-and-a11y` feature.
- Out of scope: search's own results UI, GraphQL `productFilters`.

## Decisions taken during build

- **State switcher** in `plp-mobile-1.png` ("Products / Loading / No results") is Lovable prototype chrome, not UI — it appears identically on desktop and mobile next to the Lovable edit badge. Not built.
- **Price facet**: fixed single-select buckets (Under $50 / $50–$150 / $150+), clamped to the collection's own span and hidden when they cannot narrow it. Radios, not the mockup's checkboxes, because phase 1's `price=min-max` holds one range; an explicit "Any price" option clears it, since a radio cannot be unchecked.
- **Counts** are cross-facet aware per §5.1 — new `src/lib/facets/counts.ts` composes `deriveFacets`/`applyFacets` without touching either, so phase 1's contract holds. This adds unit tests the spec did not budget for.
- **`Swatch` left untouched** for the variant picker; `FacetGroup` renders its own checkbox rows with a color dot from `src/lib/format/colors.ts`.
- **Pills vs rows**: axes whose values are all ≤4 characters (`XS`–`L`, `30`–`36`) render as pills, per the mockup; longer values (`Nylon Blend`) stay rows.
- **Filter/sort order** is settled by the data flow and unchanged: the API returns the sorted collection, `applyFacets` filters that list and preserves order.

## History

<!-- Completed features, oldest first. One line each: **Name** - summary (PR #n) -->

- **Initial Next.js setup** - Create Next App scaffold (Next.js 16.3.5, React 19.2.8, TypeScript, ESLint) plus project context docs and CLAUDE.md (direct to `main`, no PR)
- **Initial Setup** - Boilerplate removed, SCSS reset, strict TS (`noUncheckedIndexedAccess`), Prettier + editorconfig, Vitest/RTL with coverage, Node 24, MIT license (PR #1)
- **CI Pipeline** - GitHub Actions `ci` job (lint, format, typecheck, coverage ≥ 80% on `src/lib`, build), PR template, Dependabot, README placeholder with CI badge (PR #2)
- **GraphQL Layer** - Committed schema + graphql-codegen (client preset, drift check in CI), Apollo RSC client with `force-cache`/revalidate and client provider, catalog mappers/fetchers to domain types, Home lists collections from RSC, MSW + real-response fixtures, Vitest client/server projects; specs now committed on the feature branch (PR #7)
- **Design Tokens** - Two-tier CSS custom-property tokens (primitives → semantic), `bp()` breakpoint mixin, base typography + Slate focus ring, Libre Baskerville/IBM Plex Sans via `next/font`, AA-safe `--color-clay-dark`, Storybook 10 (nextjs-vite, docs, a11y) with a live Design Tokens page, token integrity/contrast test (PR #9)
- **Atoms** - `Button`, `Price`, `Badge`, `Swatch`, `Input`, `Spinner`, `VisuallyHidden` on semantic tokens with RTL tests and Storybook stories (axe 0 violations), `formatMoney` (`Intl.NumberFormat`, currency from data), `--color-primary-hover`/`--size-touch-target` tokens, component `var()` integrity test, `clsx`; no Hover stories (synthetic hover does not trigger `:hover`) (PR #10)
- **Layout & Header** - `Header`/`Footer` organisms and skip link in the root layout, nav from `menu(handle: "main-menu")` via `getMainMenu()` (URL → path, Home filtered by `FRONTPAGE`), mobile nav as native `<dialog>` + `showModal()` (jsdom stubs, trap/Escape verified in Chromium), `Button` accepts `ref`, `--color-text-inverse-muted`/`--color-focus-ring-inverse` tokens, axe 0 violations (PR #11)
- **Home Page** - Hero, collection tiles and a featured product grid on `/` (SSR), `next/image` wired up (`remotePatterns`, AVIF/WebP, `IMAGES_UNOPTIMIZED` toggle), `ProductImage` atom and first molecule `ProductCard`, `FeaturedProducts` query + `getFeaturedProducts()` (first product per collection), `loading.tsx`/`error.tsx` with `retry()`, `buttonClassName()` helper, `--ratio-product-image` token; images 281 KB → 45 KB, LCP 3.26 s → 2.51 s, CLS 0, axe 0 violations (PR #12)
- **Collection Page** - `/collections/[handle]` SSR grid with product count, empty state and API-side sort as Zod-validated URL state (`?sort=`, `sortKey`/`reverse`), `Select` atom, `JsonLd` component escaping `<` as `\u003c`, `BreadcrumbList` + canonical without query params, `metadataBase`, root `not-found.tsx`, `src/lib/facets/sort.ts` and `src/lib/seo/`; review caught focus loss on sort and an `h1`→`h3` skip, both fixed with regression tests; axe 0 violations, 202 tests (PR #13)
- **Facets Phase 1** - Pure facet logic in `src/lib/facets/`: `deriveFacets` (generic option axes from product data, per-product counts, price bounds, sale count), `applyFacets` (OR within an axis, AND across axes), `parse`/`serializeFacetsParam` (`?color=moss,clay&size=M&sale=1&price=25-200`, validated against the derived facets so unknown values show everything), `format/options.ts` labels and `toAmount`; `ProductCard` fragment widened with `options { name values }` and fixtures re-captured from the live API; verified mock.shop returns an empty `productFilters`, so server-side facets are unavailable for phase 2 too; review caught a shared mutable `EMPTY_FACETS` leaking between requests, fixed with a regression test; no UI, 202 → 309 tests, 100% on `lib/facets` (PR #14)
- **Facets Phase 2 (UI)** - Filter sidebar from lg (1280px) and a native `<dialog>` drawer below it on `/collections/[handle]`: `FacetGroup`/`FilterChip` molecules, `FilterSidebar`/`FilterPanel`/`FilterDrawer` organism, route-local `CollectionToolbar` owning the count (`aria-live`), sort and chips; new pure `src/lib/facets/counts.ts` (cross-facet counts per §5.1, single-select price buckets clamped to the collection's span) and `query.ts` (toggles + `collectionHref` merging facets with sort, commas left unencoded), `format/colors.ts` catalog colour → CSS map; price is radios + "Any price" because phase 1's `price=min-max` holds one range, and `Swatch` was left untouched for the variant picker; manual browser check caught the selected price bucket vanishing once other facets zeroed its count, fixed with regression tests; axe 0 violations on desktop, open drawer and the no-results state, 309 → 456 tests, 100% on `lib/facets`; **deferred on purpose:** the `<dialog>` wiring is now duplicated between `MobileNav` and `FilterDrawer` — 2 copies is under the project's 3+ rule, TODO left in both files, to be picked up at the next `/cleanup` before `product-page` (PR #NN)
