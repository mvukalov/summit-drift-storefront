# Current Feature

## Status

Not Started

## Goals

<!-- Checkable bullet points of what success looks like -->

- [ ]

## Notes

<!-- Constraints, decisions, links to specs and research docs -->

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
