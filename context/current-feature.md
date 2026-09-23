# Current Feature: Product Page

## Status

In Progress

## Goals

<!-- Checkable bullet points of what success looks like -->

**Phase 1 — sanitization (self-contained, testable before any PDP UI exists)**

- [x] Install `sanitize-html@2.17.7` + `@types/sanitize-html@2.16.1` (dev) — approved; installed with `--save-exact`, no `--force`/`--legacy-peer-deps` needed
- [x] `src/lib/sanitize/rich-text.ts` — `sanitizeRichText()`, allowlist exactly `p`/`ul`/`li`, `allowedAttributes: {}`, `transformTags: { ol: "ul" }`, extended `nonTextTags`, `parseStyleAttributes: false`
- [x] `RichText` atom (`.tsx`, `.module.scss`, `.test.tsx`, `.stories.tsx`) — takes raw `html: string`, sanitizes internally, returns `null` when the result is empty
- [x] ESLint guards in `eslint.config.mjs`: `no-restricted-imports` on `sanitize-html` (with `src/lib/sanitize/**` exempted); `react/no-danger` project-wide + scoped inline disable in `RichText` and `JsonLd`. **Both verified to actually fire** against throwaway probe files, not just "lint passes"
- [x] Unit tests: 34 cases in `rich-text.test.ts` (attacks, attribute stripping, tag unwrapping, `<ol>` regression, real API shapes, edges) + 7 component tests. 100% lines/branches/functions on all three new/touched files

**Phase 1 verification (done)**

- [x] Sanitizer confirmed working **inside a real Next.js RSC render** (the research doc's open item): temporary route rendered real API copy + hostile input; `<script>`, `<img onerror>` and `onclick` all gone, `<ol>` → `<ul>` applied, zero `alert(`/`onerror`/`onclick` residue in the served document. Probe route removed afterwards.
- [x] Confirmed in a production build that `sanitize-html` lands **only** in `.next/server/`, never in `.next/static/` — the client-bundle risk the `no-restricted-imports` guard exists to prevent
- [x] Gates green: lint, format, typecheck, 497 tests (456 → 497), build

**Phase 2 — data**

- [ ] `ProductByHandle` query in `src/lib/graphql/documents/`: handle, title, `descriptionHtml`, images, options, variants (id, selected options, price, `compareAtPrice`, `availableForSale`); run `npm run codegen`
- [ ] `getProduct(handle)` fetcher + mapper(s), unknown handle → `null` → `notFound()` (same pattern as `getCollection`)
- [ ] Option-name normalization in `src/lib/format/` (matching `?color=moss` against the API's casing/spacing)

**Phase 3 — PDP UI**

- [ ] `src/app/products/[handle]/page.tsx` (Server Component) + `loading.tsx` + `error.tsx`
- [ ] Gallery with **intrinsic** `width`/`height` `next/image` (not `fill` — first feature to need this; verify against Next 16 docs, don't assume `ProductImage`'s pattern transfers)
- [ ] Variant picker: `Swatch`es grouped per option in `<fieldset>`/`role="radiogroup"`, selection in URL state (Zod-validated), updates price + image + availability
- [ ] `QuantityStepper` molecule: controlled, `value`/`onChange`/`min`/`max?`, min 1
- [ ] Inert "Add to cart" `Button` — present, styled, keyboard-operable, no cart behaviour
- [ ] Out-of-stock state: disables "Add to cart" **with visible text**, not colour or a bare disabled button
- [ ] `Product` + `BreadcrumbList` JSON-LD via existing `JsonLd`; `generateMetadata` with canonical + OG image
- [ ] Component/RTL tests, Storybook stories, manual dev-server check on a real product

## Notes

<!-- Constraints, decisions, links to specs and research docs -->

- **Spec:** `context/features/011-product-page-spec.md`
- **Research:** `docs/html-sanitization.md` — read it, don't re-derive. All seven decisions are resolved there; the measured malicious-input table is the test plan for `src/lib/sanitize/`.

**Settled — do not re-open:**

- Render sanitized `descriptionHtml`, not plain text.
- Allowlist is exactly `p`, `ul`, `li` with zero attributes. No `<a>` → the research doc's flagged `rel`/`target` question is moot.
- `transformTags: { ol: "ul" }` is in, so `<ol>` can't degrade into orphan `<li>` (invalid HTML + serious axe violation). Latent today — no catalog description contains an `<ol>` — but it needs a regression test.
- Sanitization lives **only** in `RichText`. Mappers/fetchers pass `descriptionHtml` through as a plain string. No branded `SanitizedHtml` type.
- `RichText` is an **atom**, not a `ProductDescription` molecule, so `collection-page` can reuse it later.

**Known gotcha:** `react/no-danger` is not enabled by `eslint-config-next`. Turning it on immediately fails the existing `JsonLd.tsx`, so its scoped disable lands in the same commit even though the spec doesn't name that file.

**Verify at implementation time (both flagged by the spec):**

1. Sanitizer was measured in a throwaway Node harness and in this repo's Vitest `client` config — **never inside a live RSC render**. Do one real dev-server check on a product's description.
2. ~~Does mock.shop have any `availableForSale: false` variant?~~ **Answered 2026-09-23:** no — **0 of 360 variants** are unavailable, and `quantityAvailable` is `null` on all 360. Project overview §2 still holds. So the out-of-stock UI is a **deliberately untested-by-real-data branch**: build it, unit/component-test it with synthetic data, and document it as unreachable with this catalog (same treatment `collection-page` gave the empty state).

**Out of scope:** real "Add to cart"/cart state (`cart` feature); retrofitting `RichText` into `collection-page` (known gap, flagged not fixed); CSP header (now in `new-feature-list.md`); a wider allowlist; reviews/related products; E2E (`e2e-and-a11y` feature).

**Carried over from Facets Phase 2:** the `<dialog>` wiring is duplicated between `MobileNav` and `FilterDrawer` (2 copies, under the 3+ rule). A `/cleanup` was meant to happen before `product-page` — not done. Decide whether to run it first or let it ride.

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
- **Collection Page** - `/collections/[handle]` SSR grid with product count, empty state and API-side sort as Zod-validated URL state (`?sort=`, `sortKey`/`reverse`), `Select` atom, `JsonLd` component escaping `<` as `<`, `BreadcrumbList` + canonical without query params, `metadataBase`, root `not-found.tsx`, `src/lib/facets/sort.ts` and `src/lib/seo/`; review caught focus loss on sort and an `h1`→`h3` skip, both fixed with regression tests; axe 0 violations, 202 tests (PR #13)
- **Facets Phase 1** - Pure facet logic in `src/lib/facets/`: `deriveFacets` (generic option axes from product data, per-product counts, price bounds, sale count), `applyFacets` (OR within an axis, AND across axes), `parse`/`serializeFacetsParam` (`?color=moss,clay&size=M&sale=1&price=25-200`, validated against the derived facets so unknown values show everything), `format/options.ts` labels and `toAmount`; `ProductCard` fragment widened with `options { name values }` and fixtures re-captured from the live API; verified mock.shop returns an empty `productFilters`, so server-side facets are unavailable for phase 2 too; review caught a shared mutable `EMPTY_FACETS` leaking between requests, fixed with a regression test; no UI, 202 → 309 tests, 100% on `lib/facets` (PR #14)
- **Facets Phase 2 (UI)** - Filter sidebar from lg (1280px) and a native `<dialog>` drawer below it on `/collections/[handle]`: `FacetGroup`/`FilterChip` molecules, `FilterSidebar`/`FilterPanel`/`FilterDrawer` organism, route-local `CollectionToolbar` owning the count (`aria-live`), sort and chips; new pure `src/lib/facets/counts.ts` (cross-facet counts per §5.1, single-select price buckets clamped to the collection's span) and `query.ts` (toggles + `collectionHref` merging facets with sort, commas left unencoded), `format/colors.ts` catalog colour → CSS map; price is radios + "Any price" because phase 1's `price=min-max` holds one range, and `Swatch` was left untouched for the variant picker; manual browser check caught the selected price bucket vanishing once other facets zeroed its count, fixed with regression tests; axe 0 violations on desktop, open drawer and the no-results state, 309 → 456 tests, 100% on `lib/facets`; **deferred on purpose:** the `<dialog>` wiring is now duplicated between `MobileNav` and `FilterDrawer` — 2 copies is under the project's 3+ rule, TODO left in both files, to be picked up at the next `/cleanup` before `product-page` (PR #15)
