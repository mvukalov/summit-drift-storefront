# Mock Checkout Page

Replaces the external redirect to mock.shop's hosted checkout with an in-app `/checkout` page, so the user never leaves the site's own domain. This is a cosmetic/demo addition, not a real checkout — no payment, no order persistence, no backend beyond what already exists. This is a `fix/` PR (small scoped addition), not a full `/feature`.

## Why

The cart's `checkoutUrl` (from the Storefront API) currently navigates to `apparel-outdoor.hydrogen.mock.shop/checkout`, an unrelated domain that visually resembles this site (both are Hydrogen-based), which reads as confusing/broken to someone demoing the project rather than reading the README. Decision: keep the redirect out of the flow entirely and simulate the confirmation step in-app instead.

## Requirements

- New route `src/app/checkout/page.tsx` (Server Component): reads the current cart (same cart read already used elsewhere, e.g. header count / cart drawer) and renders a summary — line items, quantities, unit price, total — using existing cart display components/styles where possible, not a new visual language.
- "Place order" button (client component) below the summary: on click, shows a confirmation state in place of the summary — order-placed message, no real submission, no network call to mock.shop. A simple client-side state swap is enough; no route change needed for this step.
- After showing the confirmation, clear the local cart so the header count returns to 0 and the drawer/summary reflect an empty cart — reuse whatever mechanism already exists for removing lines (loop the existing `removeLine` action over all current lines, or add one `clearCart` Server Action if that's cleaner than looping — your call, but don't invent a second cart-clearing code path if one can be reused).
- The cart drawer's existing "Checkout" button/link now points to `/checkout` instead of the cart's `checkoutUrl` — remove the external link entirely, don't keep it as a fallback.
- Empty cart state: if `/checkout` is loaded directly with nothing in the cart, show a simple "your cart is empty" message with a link back to `/`, not a summary with zero lines.

## Expected Behavior

- Clicking "Checkout" in the cart drawer navigates to `/checkout` on this site, never to an external domain.
- `/checkout` shows the current cart's line items and total, matching what the drawer already shows.
- Clicking "Place order" shows a confirmation message and empties the cart — reloading `/` shows a 0 count in the header.
- Reloading `/checkout` directly (no active cart) shows the empty state, not an error.

## Technical

- No new dependencies, no new backend/API. Reuse the existing cart fetch, reducer, and Server Actions from `src/lib/cart/` — this page is a new consumer of that existing state, not a new subsystem.
- Follow the RSC/SSR non-overlap rule already established in the project: the cart read for the summary happens the same way it already does elsewhere (check how the header/cart drawer currently reads it and match that, don't introduce a second pattern).
- No `no-store`/caching surprises: this route reads live cart state, same caching behavior the cart already requires elsewhere.

## UI

- Reuse existing line-item display styling (from the cart drawer) for the summary — don't design a new component if the existing one can be reused or lightly adapted.
- Confirmation state: simple, on-brand messaging ("Order placed" or similar), a link back to `/`. No animation/illustration work needed.
- Empty state: consistent with how other empty states in the app are already handled (e.g. empty cart drawer, no-results search) — match that pattern, don't invent new copy style.
- Touch targets ≥44px, focus-visible maintained, matches existing accessibility bar.

## Testing

- Unit/component test for the cart-clearing logic if a new `clearCart` action is added (mirror the existing test patterns in `src/lib/cart/`).
- E2E: add a case to `e2e/cart.spec.ts` (or a new `checkout.spec.ts` if that fits the existing file organization better) — add a line, go to `/checkout`, confirm summary matches, click "Place order," confirm cart is empty afterward (header count 0). Also test `/checkout` with an empty cart shows the empty state.
- Axe: run the existing a11y sweep against `/checkout` in both states (populated, empty, confirmation).

## Out of Scope

- Any real payment processing, order persistence, shipping/tax calculation — this is a UI-only simulation of a completed order.
- Editing quantities or removing lines from the `/checkout` page itself — that stays in the cart drawer; this page is read-only summary + confirm.
- Email confirmation, order history, or any state that persists beyond the current session.

## Notes

- This changes the cart drawer's Checkout button behavior, so re-verify `e2e/cart.spec.ts`'s existing checkout-related assertions (if any referenced the old `checkoutUrl` behavior) still make sense after this change — update them rather than leaving them describing removed behavior.
- Mention this in the README if there's a line describing the old checkout redirect behavior (the Live Demo section currently says "The checkout button leads to mock.shop's demo checkout page" — update that to describe the new in-app flow instead).
