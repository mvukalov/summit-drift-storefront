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

- [x] `ProductByHandle` query + `ProductDetail`/`ProductVariant` fragments; codegen run and output committed
- [x] `getProduct(handle)` fetcher + `toProductDetail`/`toProductVariant` mappers, unknown handle → `null` → `notFound()`; real fixture captured from the live API and wired into MSW
- [x] ~~Option-name normalization~~ **already exists** — `src/lib/format/options.ts` (`formatOptionName`/`formatOptionValue`) shipped with Facets Phase 1, and `parseFacetsParam` established that the URL carries the **raw API value**, matched exactly. Nothing to add; building a second normalizer is exactly what the spec warned against

**Phase 2 findings (carried into Phase 3)**

- `seo.description` is **unusable**: 17 of 30 products return HTML inside it and 23 are truncated mid-sentence with `...`. `generateMetadata` and JSON-LD must use the plain `description` field, which is clean on all 30. The query does not select `seo` at all.
- **Every variant of every product reports the product's featured image** (30/30 verified). The spec's "image switches when the variant has its own image" is therefore unreachable with this catalog — same class as out-of-stock. Build it, test it synthetically, document it.
- `vendor` is uniform (`Summit Drift Outfitters`) → the JSON-LD brand. `productType` mirrors the collection title.
- ~~**Deviation from project overview §7, needs a ruling.**~~ **Approved 2026-09-23:** `ProductDetail` stays a separate type rather than extending `ProductCard`, because the card's "from" price comes from the collection range and the PDP's from the selected variant. §7 has been updated to match, along with a note that `descriptionHtml` is carried raw.

**Phase 3 — PDP UI**

- [x] `src/app/products/[handle]/page.tsx` (Server Component) + `loading.tsx` + `error.tsx`
- [x] `ProductGallery` with **intrinsic** `width`/`height` (Next 16 docs read first: intrinsic dims reserve the ratio, `sizes` is still needed, `priority` is deprecated in favour of `loading="eager"` + `fetchPriority`)
- [x] `VariantPicker`: one `<fieldset>` radio group per axis, selection in the URL, updates price + image + availability. Pure logic in new `src/lib/variants/selection.ts` (33 tests)
- [x] `QuantityStepper` molecule: controlled, 1–10, draft state so the field can be empty mid-edit
- [x] Inert "Add to cart" — real enabled button when purchasable, so the disabled state means out of stock and nothing else
- [x] Out-of-stock: disabled button **plus** a text explanation
- [x] `Product` + `BreadcrumbList` JSON-LD (`src/lib/seo/product.ts`, `AggregateOffer` for multi-variant, plain `Offer` for one); `generateMetadata` with canonical + OG image
- [x] Component/RTL tests, Storybook stories, real-browser verification

**Phase 3 verification (done in a production build + real browser)**

- [x] axe **0 violations** at 1280 / 768 / 375, and after a client-side variant navigation. No horizontal overflow at any width.
- [x] Variant URL round-trip: clicking Moss → `?color=moss&size=XS`, price $249.00 → $261.45, legend and checked radios follow, scroll position unchanged.
- [x] Touch targets 44px (swatches, stepper buttons, Add to cart). Console clean.
- [x] `notFound()` returns HTTP **200, not 404** — and that is documented Next 16 behaviour, not a bug: 200 for streamed responses (these routes have `loading.tsx`), 404 for non-streamed. `notFound()` injects `<meta name="robots" content="noindex">`, which is present, so the SEO risk is covered. The collection route behaves identically.

**Three real-browser findings the jsdom tests could not catch**

1. The visually-hidden radio was clipped to 1px and sat under the colour dot, which intercepted the click. Replaced with the project's existing pattern (input covers the label, `opacity: 0`) — as used by `FacetGroup` and `Swatch`.
2. Touch target measured 42px, not 44: `inset: 0` stops at the padding box, and an explicit `width`/`height: 100%` overrode the stretch. Fixed with `inset: -1px` and no explicit size.
3. Eager thumbnails made the browser preload an image candidate it never used. Thumbnails are now lazy; one preload instead of two.

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

1. ~~Sanitizer never verified inside a live RSC render.~~ **Done in Phase 1** — temporary route on the dev server rendered real API copy plus hostile input, everything dangerous stripped, and a production build confirmed `sanitize-html` never reaches `.next/static/`.
2. ~~Does mock.shop have any `availableForSale: false` variant?~~ **Answered 2026-09-23:** no — **0 of 360 variants** are unavailable, and `quantityAvailable` is `null` on all 360. Project overview §2 still holds. So the out-of-stock UI is a **deliberately untested-by-real-data branch**: build it, unit/component-test it with synthetic data, and document it as unreachable with this catalog (same treatment `collection-page` gave the empty state).

**Out of scope:** real "Add to cart"/cart state (`cart` feature); retrofitting `RichText` into `collection-page` (known gap, flagged not fixed); CSP header (now in `new-feature-list.md`); a wider allowlist; reviews/related products; E2E (`e2e-and-a11y` feature).

**Carried over from Facets Phase 2: resolved.** The `<dialog>` wiring duplicated between `MobileNav` and `FilterDrawer` was extracted into `src/hooks/useModalDialog.ts` during the `/cleanup` run between Phase 1 and Phase 2, with its own test. Both TODOs are gone.

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
