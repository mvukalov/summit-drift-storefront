# Cart Spec

## Overview

Build the cart: an httpOnly-cookie cart id, Server Actions as the only code that talks to the Storefront cart API, and an instant UI driven by React 19 `useOptimistic` over a pure reducer in `src/lib/cart/`. It replaces the inert "Add to cart" button from `product-page` and the placeholder cart trigger from `layout-header` with a working add / update / remove flow, a header count that is server-rendered without hydration mismatch, and a cart drawer. All decisions below are made in `docs/cart.md` ("Decisions", 2026-09-24) — read it before implementing, don't re-derive.

## Requirements

- `src/types/cart.ts`: domain `Cart` and `CartLine`, including `CartLine.unitPrice` (approved extension of the `project-overview.md` §7 shape; needed for an honest optimistic subtotal).
- `src/lib/graphql/documents/cart.graphql`: `cart(id)` query, `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, one shared cart fragment. `npm run codegen`; generated output committed.
- `src/lib/cart/cookie.ts` (`server-only`): read/write the `cart_id` cookie — httpOnly, `sameSite: "lax"`, `secure` in production, `path: "/"`, 7-day `maxAge`. Written **only** when a cart is created.
- `src/lib/cart/mappers.ts`: generated cart fragment → domain `Cart`. Falls back to `merchandise.price` when `cost.amountPerQuantity` is null.
- `src/lib/cart/limits.ts`: `MIN_QUANTITY = 1`, `MAX_QUANTITY = 10`, `clampQuantity`, `canAddToLine(cart, variantId, requested)` — the single shared guard used by client and server.
- `src/lib/cart/reducer.ts`: pure `cartReducer(cart, intent)` with intents `add`, `setQuantity`, `remove`. No React, no GraphQL.
- `src/lib/cart/actions.ts` (`"use server"`): `addToCart`, `updateCartLine`, `removeCartLine`, each returning `{ ok: true; cart } | { ok: false; error }`. The cart id never comes from the client.
- `CartProvider` (client): `useState(initialCart)` as base, `useOptimistic(cart, cartReducer)` for display; the base advances only on `ok: true`.
- Header cart count rendered on the server from the same cookie; cart read wrapped in `<Suspense>` with a fallback that reserves the badge's space (no CLS).
- `CartDrawer` organism: lines, quantity stepper, remove, subtotal, checkout link. Uses `useModalDialog` (third consumer after `MobileNav` and `FilterDrawer`).
- PDP "Add to cart" wired to `addToCart`; opens the drawer and moves focus into it on success.
- Quantity stepper debounce: optimistic UI updates on every click; the network send fires after **300 ms** with the settled value.
- LCP for `/` measured **before** starting implementation and again after; both numbers recorded (see Notes).

## Expected Behavior

- **First add:** no cookie → action creates the cart, writes the cookie, returns the cart; drawer opens with the line and correct count.
- **Add existing variant:** quantity increases on the existing line (no duplicate line). Existing lines are updated with an absolute `cartLinesUpdate`, never `cartLinesAdd`, so the ceiling can't be overshot and the call is safe to retry.
- **Overflow (decision 4):** if the line is already at 10, or the requested amount would push it past 10 (e.g. 8 + 5), the add is **refused** with a message that the line is at its maximum. No partial add, no clamping follow-up mutation. The client checks `canAddToLine` first, so the refusal is instant, nothing is dispatched and nothing rolls back; the Server Action re-checks against a freshly read cart.
- **Stepper:** bounded 1–10. Going to 0 (or pressing remove) removes the line. Rapid clicks show every intermediate value immediately but send one mutation with the final value.
- **Optimistic + rollback:** new lines are prepended (server order is newest-first). On network error or any `userErrors` response the base does not advance and React reverts automatically; a short user-facing message is shown. `INVALID_MERCHANDISE_LINE` maps to "That option is no longer available" — never the raw API message.
- **Expired/dead cart id:** `cart(id)` returns `null` → treated as an empty cart. A mutation that fails with `INVALID` on `cartId` starts a fresh cart instead of failing the click.
- **Emptied cart:** removing all lines keeps the cookie and the cart (same id, `totalQuantity: 0`); drawer shows an empty state.
- **Reload:** cart, count and quantities survive; the count is already correct in the server-rendered HTML.
- No GraphQL requests from the browser. `ApolloWrapper` stays in the tree for predictive search only and the cart never touches client Apollo.

## Technical

- **Reverses `apollo-nextjs.md` decision 4** (client Apollo cache for the cart). Record the reversal as a README trade-off next to the original decision. The `search` feature must later confirm whether it still needs `ApolloWrapper`.
- Cart reads in Server Components use the RSC Apollo client with `context: { fetchOptions: { cache: "no-store" } }` (per-query override already provided by `apollo-nextjs.md` decision 4).
- No `revalidatePath` / `revalidateTag` / `refresh` on cart mutations — the action's return value advances client base state.
- The cookie write on first add triggers a route re-render; harmless but redundant — leave a comment so nobody treats it as load-bearing. The provider ignores later `initialCart` prop changes.
- Server Actions are dispatched one at a time per client; that is why the stepper debounce exists.
- Setter from `useOptimistic` must be called inside a transition.
- `/` becomes dynamic (only route affected; `/collections/[handle]` and `/products/[handle]` already are). **Cache Components stays out of scope**, even if LCP moves — deferred to the performance phase.
- `QuantityStepper` (built in `product-page`) gains `max = MAX_QUANTITY` where used for cart quantity; extend it rather than creating a second stepper. PDP quantity is capped at 10 as well.
- Follow existing patterns: domain types in `src/types/`, mappers in `src/lib/<domain>/`, `{ ok } | { error }` result convention, one concern per lib folder, no GraphQL types leaking into components.

Files (from research, adjust only with reason):

```
src/lib/cart/{cookie,reducer,limits,mappers,actions}.ts (+ tests)
src/components/organisms/CartDrawer/
src/components/organisms/CartProvider/
src/lib/graphql/documents/cart.graphql
src/types/cart.ts
```

Suggested order: (1) baseline LCP of `/`; (2) `cart.graphql` + codegen; (3) types, mappers, limits, cookie; (4) reducer + tests, before any UI; (5) actions with `userErrors` mapping and dead-cart recovery; (6) `CartProvider`, header count, `CartDrawer`; (7) wire PDP "Add to cart"; (8) component tests, E2E, axe; (9) LCP after.

## UI

- Reference the cart/drawer screenshots in `context/screenshots/` (direction only). Drawer follows the same modal pattern as `MobileNav` / `FilterDrawer` via `useModalDialog`: focus trap, Esc, focus return, scroll lock.
- Touch targets ≥44px on stepper buttons, remove, checkout link, drawer close.
- Focus-visible via the existing token; no new focus style.
- Header badge fallback reserves its own width (no CLS). Count changes announced politely (`aria-live="polite"`) without moving focus.
- Refusal / error messages are text, not color alone, and are associated with the control that caused them.
- Empty state in the drawer with a link back to browsing.
- Checkout link uses `cart.checkoutUrl` (mocked constant on mock.shop — fine).

## Testing

- **Unit — `src/lib/cart/` (the ≥80% coverage gate lands here):**
  - Reducer: merge-on-add by `variantId`; new lines prepended; `setQuantity(0)` removes; subtotal and `totalQuantity` recomputed from lines; empty-cart and single-line edges; **never mutates its input** (the `EMPTY_FACETS` regression from PR #14 is the reason to assert this).
  - `canAddToLine` table: under limit passes; exactly at limit (`10 + 1`) refuses; **overshoot (`8 + 5`) refuses outright instead of landing on 10**; variant not yet in cart judged on the requested amount alone; request above `MAX_QUANTITY` on an empty cart refuses. These cases _are_ decision 4 and must fail loudly if clamping is ever reintroduced.
  - Mappers against a real captured response, including the `amountPerQuantity` null fallback. Cookie helpers: round-trip and absent cookie → `null`.
- **Component (RTL + MSW):** drawer renders lines, quantities, subtotal; stepper bounded 1–10; **optimistic path** (new quantity on screen before the mocked mutation resolves, and stays after); **rollback path** (`userErrors: [{ code: "INVALID_MERCHANDISE_LINE" }]` and a network error — old quantity returns, message appears); **refusal path** (line at 10, press add → maximum message, MSW handler **not** called, quantity unchanged); debounce with fake timers (five `+` presses → one mutation carrying the final value); PDP add opens the drawer and moves focus.
- **E2E (Playwright, real API):** add → update → remove; reload and assert the cart survives; add the same variant twice → one merged line; axe on the open drawer; header count correct in the **initial server response** (assert against the raw HTML, not the hydrated DOM).
- **Storybook + a11y addon:** `CartDrawer` (empty, populated, at-maximum, error), header badge.
- **Manual:** dev-server check of the optimistic flow and the refusal message; time the two sequential API calls on add-to-existing-cart (Risk 6 in the research).
- **Not worth testing:** discount codes (always `applicable: false`) and out-of-stock adds (0/360 unavailable variants), consistent with `product-page`.

## Out of Scope

- Cache Components / PPR — performance phase.
- Cross-tab cart sync (`storage` event / polling) — README note only.
- Discount codes, gift cards, notes, shipping/tax estimates, real checkout (mock `checkoutUrl` only).
- Predictive search and any change to `ApolloWrapper` beyond documenting its new sole purpose.
- A second readable cookie for the count (rejected in the research).
- Retrofitting `RichText` into collection pages or the PDP mockup deviations follow-up — separate work.

## Notes

- Source of truth: `docs/cart.md` (decisions 1–5, 17 verified API facts, code sketches). Prior research: `docs/apollo-nextjs.md`.
- Decisions: (1) httpOnly cookie + Server Actions, reversing `apollo-nextjs.md` decision 4; (2) dynamic `/` accepted with `<Suspense>`, record LCP before/after like `image-performance.md`, Cache Components deferred; (3) `CartLine.unitPrice` approved; (4) overflow on add is refused, no follow-up clamp; (5) stepper debounce 300 ms on the network send only.
- Cart expiry window is unverified and the 7-day `maxAge` is a guess; an expired id reads back as `null`, so the failure mode is a fresh cart.
- Confirm the drawer doesn't keep a stale `optimistic:` key in a list animation after rollback.
- No new dependencies expected. If one turns out to be needed, ask before installing (standing rule).

## Verify first

1. Measure and record LCP (and Lighthouse perf) for `/` **before** any change, so the after-number is comparable.
2. Confirm the existing `QuantityStepper`'s draft-state behaviour supports "update on every click, send after 300 ms" before extending it; adapt rather than duplicate.
3. Check a few more real cart lines for a null `cost.amountPerQuantity` (research only saw a handful) and make sure the mapper fallback is exercised by a test.
