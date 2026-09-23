# Facets — Phase 2 (UI) Spec

## Overview

Second half of `facets`: the filter sidebar/toolbar UI on `/collections/[handle]`, wired to the pure `deriveFacets`/`applyFacets`/`parseFacetsParam`/`serializeFacetsParam` logic already shipped in phase 1 (`src/lib/facets/`). This is where the left-column filters, filter chips, and "Clear all" from `context/screenshots/plp-*.png` — explicitly out of scope in both `collection-page` and phase 1 — finally get built, and where `collection-page`'s sort toolbar gets revisited to sit alongside filters, per that spec's own note that the toolbar was intentionally left route-local for this reason.

## Requirements

- Filter sidebar (desktop) / filter panel (mobile) on `/collections/[handle]`: Color, Size, Price range, "On sale only" — built from `deriveFacets(products)`'s output, so only option values actually present in that collection are shown (with counts).
- Selecting/deselecting a filter updates the URL (`?color=moss&size=m&sale=1`, via `serializeFacetsParam`) and the grid re-renders with `applyFacets` applied.
- Filter chips row above the grid, one per active filter (e.g. "Moss ×", "Size M ×", "On sale ×"), each individually removable.
- "Clear all" control, visible only when at least one filter is active.
- Product count text updates to reflect the filtered count (extends `collection-page`'s existing count text, which currently only reflects the unfiltered total).
- Empty-result state: "no products match these filters" (distinct from `collection-page`'s existing "empty collection" state — a collection with 0 products total vs. 0 products after filtering are different messages) with a way back to clearing filters.
- Sort control from `collection-page` moves into the same toolbar row as the filter trigger/chips (mobile: filters likely open in a sheet/drawer alongside or via the same trigger — follow `context/screenshots/plp-mobile-1.png`'s "Products / Loading / No results" state switcher for the mobile pattern, to the extent it's meant as UI and not just a Lovable prototype artifact — confirm which before building it literally).

## Expected Behavior

- Desktop: sidebar filters + grid side-by-side, as in `plp-desktop-1.png`/`-2.png`.
- Mobile: filters collapse behind a trigger (button/sheet), as `plp-mobile-1.png` implies; exact interaction pattern is Martin's/Claude Code's call within the mockup's direction (this is UX reference, not pixel spec, same caveat as every prior UI-touching feature).
- Choosing a filter value updates the grid without a full page reload (client-side navigation via `useRouter`/`useSearchParams`, same mechanism `collection-page`'s sort control already uses) — server re-renders with the new `applyFacets` result.
- Combining filters + sort works together: `?color=moss&sort=price-asc` filters first, then sorts (or vice versa — pick one order and keep it consistent; document the choice, since `sortKey`/`reverse` still go to Shopify's collection query while filtering happens client-side per phase 1's approach, so the actual order is: GraphQL returns sorted collection products → `applyFacets` filters that already-sorted list → order is preserved).
- Removing all filters (via chips or "Clear all") returns to the unfiltered grid and count.
- Keyboard/screen-reader users can operate every filter control and read the active-filter chips and updated count (`aria-live` region for the count, so screen-reader users get non-visual feedback that the grid changed).

## Technical

- New molecule(s): `FacetGroup` (a labeled group of checkboxes/swatches for one dimension — reuses the existing `Swatch` atom for Color, plain checkboxes or a `Swatch`-like pattern for Size, a min/max `Input` pair or a simple range control for Price, a single checkbox for On sale) and a `FilterChip` molecule for the chips row — both named in `project-overview.md` §6's molecule list, per `collection-page`'s note that they were deferred here.
- New organism `FilterSidebar` (or similar) composing the `FacetGroup`s + "Clear all"; a separate lightweight mobile variant/wrapper if the drawer pattern needs different structure, not just CSS media queries, per how `Header`'s mobile panel was handled in `layout-header`.
- `src/app/collections/[handle]/page.tsx`: call `deriveFacets` on the fetched product list, read selected facets from `searchParams` via `parseFacetsParam`, call `applyFacets` before rendering the grid, pass derived facet groups + selected state down to the new UI.
- Sort + facets both live in the same `searchParams`-driven Server Component flow — no new client-side data fetching; only the URL navigation wiring (already established by `collection-page`'s sort `<select>`) is client-side.
- `aria-live="polite"` region for the product count text, so it announces on filter/sort change without moving focus.
- If mobile uses a sheet/drawer, evaluate the same native `<dialog>` approach `layout-header` used for the mobile nav panel, for consistency and to reuse the focus-trap/`Escape` pattern already proven there — don't re-invent a second modal pattern in the same project.

## UI

- Reference `context/screenshots/plp-desktop-1.png`/`-2.png`, `plp-mobile-1.png` — this is the feature those mockups were held back for; build the left-column filters, filter chips, and the state switcher now.
- Touch targets ≥44px on every filter control, chip's remove button, and "Clear all".
- Color is never the only signal on `Swatch`-based filters (already guaranteed by the `Swatch` atom's design from `atoms`).
- Focus-visible ring via the existing `--color-focus-ring` token on every new interactive element — no new focus style.
- Reduced motion respected on any drawer/sheet open-close transition (existing global rule, same check `layout-header` already did for its mobile panel).

## Testing

- **Unit:** none new beyond phase 1's (`deriveFacets`/`applyFacets`/URL parse-serialize already covered there) — this phase is composition + wiring, not new pure logic.
- **Component (RTL):** `FacetGroup` — renders options with counts, toggling calls the right handler; `FilterChip` — renders label, remove button fires the right callback; `FilterSidebar`/mobile variant — selecting a filter updates the URL (mock `useRouter`), "Clear all" only appears with active filters and clears them all. Updated `page.test.tsx` for `/collections/[handle]` — filtered grid reflects `applyFacets` output for a given `searchParams`, empty-after-filtering state renders distinctly from empty-collection state, count text reflects the filtered count.
- **Storybook + a11y addon:** `FacetGroup` (default, with selections, empty-options edge case), `FilterChip`, `FilterSidebar` (desktop layout) and its mobile drawer variant if structurally distinct.
- **E2E:** still deferred to `e2e-and-a11y` per the project's established pattern, but this is the first feature where an E2E "select multiple filters, verify grid and URL" flow becomes meaningful — flag it there rather than adding ad hoc E2E here.

## Out of Scope

- Any change to `deriveFacets`/`applyFacets`/`parseFacetsParam`/`serializeFacetsParam` themselves — phase 1's contract is fixed; if this phase finds it insufficient (e.g. price range UX needs a debounced slider that phase 1's boundary logic doesn't quite fit), that's a bug report against phase 1's spec, not a silent scope change here.
- `search` feature's own filtering/sorting UI, even if it turns out visually similar — that feature builds its own combobox-driven results view.
- Server-side/GraphQL `productFilters` — only relevant if phase 1's "Verify first" #1 came back showing it's the better approach; otherwise this phase's UI stays bound to the client-side `applyFacets` model as designed.

## Notes

- This is the feature `collection-page` and phase 1 both explicitly deferred UI/toolbar decisions to — expect to revisit `collection-page`'s route-local sort `<select>` structurally, not just visually, now that it shares a toolbar with filters.
- Whether mobile follows `plp-mobile-1.png`'s literal "Products / Loading / No results" switcher, or that's read as Lovable-prototype chrome rather than intended UI, is a judgment call to make when actually looking at the mockup during build — same caveat as every UI reference in this project.
