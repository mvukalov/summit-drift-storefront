# Current Feature: Cart

## Status

In Review

## Goals

<!-- Checkable bullet points of what success looks like -->

- [x] Baseline: measure and record LCP + Lighthouse perf for `/` **before** any implementation
- [x] `src/lib/graphql/documents/cart.graphql`: `cart(id)` query, `cartCreate`, `cartLinesAdd/Update/Remove`, one shared cart fragment; `npm run codegen` output committed
- [x] `src/types/cart.ts`: domain `Cart` / `CartLine` incl. approved `CartLine.unitPrice`
- [x] `src/lib/cart/cookie.ts` (`server-only`): `cart_id` cookie — httpOnly, `sameSite: "lax"`, `secure` in prod, `path: "/"`, 7-day `maxAge`, written only on cart creation
- [x] `src/lib/cart/mappers.ts`: cart fragment → domain `Cart`, falling back to `merchandise.price` when `cost.amountPerQuantity` is null
- [x] `src/lib/cart/limits.ts`: `MIN_QUANTITY`/`MAX_QUANTITY` (1–10), `clampQuantity`, `canAddToLine` as the single guard shared by client and server
- [x] `src/lib/cart/reducer.ts`: pure `cartReducer(cart, intent)` — `add`, `setQuantity`, `remove`; no React, no GraphQL, never mutates its input
- [x] `src/lib/cart/actions.ts` (`"use server"`): `addToCart`, `updateCartLine`, `removeCartLine` returning `{ ok: true; cart } | { ok: false; error }`; cart id never from the client; `userErrors` mapped to friendly text; dead-cart recovery
- [x] `CartProvider` (client): `useState(initialCart)` base + `useOptimistic(cart, cartReducer)` for display; base advances only on `ok: true`; ignores later `initialCart` changes
- [x] Header cart count server-rendered from the cookie, `aria-live="polite"`, no CLS (badge is positioned over the icon). **The `<Suspense>` wrapper is deliberately not implemented** — accepted by the architect on 2026-09-24, because streaming it requires cart state outside React context. Cost measured and recorded in `docs/cart.md` and as a README trade-off; Cache Components stay in the performance phase.
- [x] `CartDrawer` organism: lines, quantity stepper, remove, subtotal, checkout link, empty state; `useModalDialog` (third consumer)
- [x] PDP "Add to cart" wired to `addToCart`; opens the drawer and moves focus into it on success
- [x] Stepper: optimistic update on every click, one network send 300 ms after the settled value; `QuantityStepper` extended with `max = MAX_QUANTITY` (PDP capped at 10 too)
- [x] Overflow on add refused outright (at 10, or 8 + 5) — no clamping, no partial add; instant client refusal, re-checked server-side
- [x] Tests: unit (`src/lib/cart/` at **97%**), component (optimistic, rollback, refusal, debounce), Storybook stories for `CartDrawer` + header badge; 600 → 708 tests
- [x] **E2E deferred to `e2e-and-a11y`** — Playwright is deliberately not installed (architect, 2026-09-24). Every case from the spec is carried into `context/new-feature-list.md`, including the raw-server-HTML count assertion, and each was verified manually in Chromium in the meantime.
- [x] README trade-off recording the reversal of `apollo-nextjs.md` decision 4, cross-tab sync note
- [x] After: LCP for `/` re-measured and both numbers recorded

## Notes

<!-- Constraints, decisions, links to specs and research docs -->

### Outcome (2026-09-24)

**Architect's decisions on the two open questions (2026-09-24):** the `<Suspense>` deviation is accepted with its cost recorded; Playwright is not installed and the E2E cases move to `context/new-feature-list.md`. Both Apollo lessons are written into `docs/apollo-nextjs.md` ("Learned in use"). `/`'s LCP above 2.5 s is pre-existing and is recorded as input for the performance phase.

- **All gates pass:** lint, typecheck, format, 708 tests (600 → 708), production build. `lib/cart` coverage 97%.
- **Two real bugs the tests/browser caught, not review:**
  1. Apollo's `query` shortcut must not be used inside a Server Action (it builds a client per call); actions now create one client via `getClient()` and thread it through.
  2. **`possibleTypes` was missing**, so a cart read back through Apollo's normalized cache lost _every_ field except `__typename` — `CartLine` is a fragment on the `BaseCartLine` interface. Fixed in `graphql/config.ts` + a regression test that asserts the failure mode.
- **Three browser-only findings:** the stepper's label rendered visibly in the drawer (fixed with a `labelHidden` prop on `QuantityStepper`); a product with no variants silently lost its "Out of stock" button (restored); the stale production server on port 3000 was masking the dev server.
- **Verified in Chromium:** count correct in raw server HTML with only a cookie and no JS (`Cart, 5 items`); 5 rapid clicks → every intermediate value on screen, **1** request; refusal at the ceiling → **0** requests; reload survives; merge-on-add gives one line; newest-first order; axe **0 violations** (populated, empty, 375/1280); all touch targets ≥44px.
- **Risk 6 answered:** the extra read on add-to-existing costs nothing measurable (517 ms vs 565 ms for the single-call create path).
- **Verify-first answers:** `QuantityStepper` already commits per click, so the debounce belongs in the consumer and the stepper needed no rework; `cost.amountPerQuantity` was non-null and equal to `merchandise.price` on **27 real lines** and is non-null in the schema, so the mandated fallback is unreachable and is covered synthetically (the PR #16 precedent).
- **Deviations from the spec, each with a reason:**
  - `<Suspense>` around the cart read — not implemented; accepted by the architect with the cost recorded.
  - E2E — not written; Playwright stays out and the cases moved to `context/new-feature-list.md`.
  - Component tests mock **the Server Action module**, not MSW. With the cart behind Server Actions the browser issues no GraphQL request, so there is nothing for MSW to intercept; the action is the seam. MSW still covers the server-side action tests.
  - New file `src/lib/cart/fetchers.ts` (not in the spec's file list): reads are kept out of the `"use server"` module because every export of one becomes a public POST endpoint.
  - `getCartFromCookie` swallows a failed cart read and renders an empty cart, because it runs in the root layout and throwing would replace every page on the site with an error boundary over a header badge.

- Spec: `context/features/012-cart-spec.md`. Source of truth for decisions: `docs/cart.md` ("Decisions", 2026-09-24) — read it before implementing, do not re-derive. Prior research: `docs/apollo-nextjs.md`.
- **Architecture:** httpOnly cookie + Server Actions are the only code that talks to the cart API. No GraphQL from the browser; the cart never touches client Apollo. `ApolloWrapper` stays for predictive search only.
- **Reverses `apollo-nextjs.md` decision 4** (client Apollo cache for the cart) — record as a README trade-off next to the original.
- Cart reads in Server Components use the RSC Apollo client with `context: { fetchOptions: { cache: "no-store" } }`. No `revalidatePath`/`revalidateTag`/`refresh` on mutations — the action's return value advances client base state.
- Adds to an existing line use an absolute `cartLinesUpdate`, never `cartLinesAdd`, so the ceiling can't be overshot and retries are safe.
- `cart(id)` → `null` is treated as an empty cart; a mutation failing with `INVALID` on `cartId` starts a fresh cart. `INVALID_MERCHANDISE_LINE` → "That option is no longer available", never the raw message.
- Emptied cart keeps the cookie and cart id (`totalQuantity: 0`). New lines are prepended (server order is newest-first).
- `useOptimistic`'s setter must be called inside a transition. Server Actions are dispatched one at a time per client — hence the debounce.
- `/` becomes dynamic; accepted. **Cache Components / PPR stays out of scope** even if LCP moves.
- The cookie write on first add re-renders the route: harmless but redundant — leave a comment so nobody treats it as load-bearing.
- Verify first: (1) baseline LCP; (2) that `QuantityStepper`'s draft state supports "update every click, send after 300 ms" — adapt, don't duplicate; (3) more real cart lines for null `cost.amountPerQuantity`, with the fallback covered by a test.
- Open/unverified: cart expiry window (7-day `maxAge` is a guess; expired id reads back as `null`). Confirm the drawer doesn't keep a stale `optimistic:` key in a list animation after rollback.
- No new dependencies expected — ask before installing.
- Not worth testing: discount codes (always `applicable: false`), out-of-stock adds (0/360 unavailable).
- **Out of scope:** Cache Components/PPR, cross-tab sync (README note only), discount codes, gift cards, notes, shipping/tax, real checkout, predictive search, a second readable count cookie, retrofitting `RichText`.

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
- **Product Page** - `/products/[handle]` SSR: `ProductGallery` with **intrinsic** `next/image` sizing (first non-`fill` use; `priority` is deprecated in Next 16), `VariantPicker` as one `<fieldset>` radio group per axis with the selection in the URL (`?color=moss&size=M`, raw API values matched exactly as `parseFacetsParam` does), `QuantityStepper` molecule (draft state so clearing the field can't make the next keystroke append), inert "Add to cart", `Product` + `BreadcrumbList` JSON-LD and canonical metadata; new `src/lib/variants/selection.ts` (resolve partial/nonsense selections, disable impossible combinations) and `src/lib/seo/product.ts`; **sanitization** via `sanitize-html` behind `src/lib/sanitize/` and a `RichText` atom that takes **raw** HTML so no path can render it unsanitized, locked in by `react/no-danger` + `no-restricted-imports` (both verified to actually fire against probe files); research in `docs/html-sanitization.md` measured DOMPurify as a silent no-op server-side (28 MB via jsdom vs 4.1 MB) and 24 attacks before any code existed; `useModalDialog` hook extracted from the `MobileNav`/`FilterDrawer` duplication carried over from facets phase 2; **three defects only a real browser caught** (radio clipped under the colour dot so clicks missed, 42px touch target because an explicit size overrode `inset`, unused image preload from eager thumbnails); `seo.description` rejected as unusable (HTML in 17/30, truncated in 23/30); out-of-stock and per-variant images are deliberately unreachable with this catalog (0/360 unavailable, all variants share the featured image) and covered synthetically; axe 0 violations at 1280/768/375, 456 → 600 tests (PR #16)
