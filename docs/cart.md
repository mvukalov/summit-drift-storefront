# Cart Persistence & Optimistic Updates

> Research for `context/research/cart-persistence.md`. Done on 2026-09-24 against Next.js 16.3.5 and React 19.2.8 (installed), and the live mock.shop API that day.
> **Verified** = seen in bundled docs, React docs or a live API response. **Assumption** = not tested yet; confirm during implementation.

## Recommendation

Keep the cart id in an **httpOnly cookie**, make **Server Actions** the only code that talks to the cart API, and drive the instant UI with **React 19 `useOptimistic` over a pure reducer in `src/lib/cart/`**.

The cookie is httpOnly because the cart id is a bearer token: the `?key=` it carries is the only thing standing between a visitor and someone else's cart, and there is no reason for browser JavaScript to hold it. That decision cascades: if the client can't read the id, the client can't call the API, so every mutation is a Server Action that reads the id from the cookie and takes only a reference plus the change (`lineId`, `quantity`) from the caller — exactly the shape the Next.js security guide prescribes. It also settles the hydration question for free, because the header count is rendered on the server from the same cookie, so the first client render already agrees with the HTML.

Optimistic state uses `useOptimistic(cart, cartReducer)`, where `cartReducer` is an ordinary pure function exported from `src/lib/cart/reducer.ts`. That keeps the interesting logic — merge-on-add, quantity clamping, subtotal recomputation, newest-first insertion — in plain TypeScript that unit tests can drive directly, while React handles the hard part. **Rollback needs no code**: React reverts to the base value when the transition ends, and the base value only advances when the action reports success, so a network failure and a `userErrors` response roll back through the same path. The Server Action returns a discriminated result (`{ ok: true, cart } | { ok: false, error }`) matching the project's existing error convention, and the provider calls `setCart` only on `ok: true`.

Do **not** revalidate on cart mutations. The cart is not part of any cached page data, so the action's return value updating client base state is both cheaper and more precise than a route re-render.

## Decisions

Made by the project architect on 2026-09-24. These replace the matching options under "Alternatives and trade-offs" and any snippet above that says otherwise. They are carried into the cart feature spec.

1. **httpOnly cookie + Server Actions: approved.** This **reverses `apollo-nextjs.md` decision 4**, which reserved the client-side Apollo cache for the cart. The cart never touches client Apollo.
   - Consequence: `ApolloWrapper` remains in the tree **for predictive search only**. The search feature must confirm it still needs it; if that feature also ends up server-driven, the provider comes out entirely.
   - Record this reversal as a README trade-off alongside the original decision.
2. **Dynamic `/`: accepted.** Wrap the cart read in `<Suspense>` so the shell and page content stream without waiting on the cart query. **Measure LCP before/after and record the numbers**, as `image-performance.md` did.
   - **Cache Components stays deferred to the performance phase.** It is not in scope for the cart feature even if the LCP number moves.
3. **`CartLine.unitPrice`: approved**, extending the §7 shape.
4. **Overflow on add: refuse.** If the line is already at `MAX_QUANTITY`, or the requested amount would push it past, the add is rejected with a message saying the line is at its maximum. **No follow-up clamping mutation**, and no silent partial add.
5. **Stepper debounce: 300 ms**, on the network send only. The optimistic UI updates on every click with no delay.

## Verified facts

### Live API cart behaviour (`https://apparel-outdoor.mock.shop/api`, 2026-09-24)

Every item below was observed in an actual response, not read from Shopify's docs.

| #   | Behaviour                             | Observed                                                                                                                                                                                      |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cart id shape                         | `gid://shopify/Cart/c1-<32 hex>?key=<32 hex>` — **91 bytes, and it contains a query string**                                                                                                  |
| 2   | `cartCreate`                          | Works with initial `lines`, and also with an empty `input: {}`                                                                                                                                |
| 3   | Persistence                           | `cart(id)` returns the cart on a later, unrelated request. Server-side, no client state needed                                                                                                |
| 4   | **Add merges**                        | `cartLinesAdd` of a variant already in the cart **increments the existing line** (2 + 3 → 5) and keeps the same `CartLine` id. It does not create a second line                               |
| 5   | **Line order**                        | Lines come back **newest-first** (`14208, 14207, 14206, 14205`), stable across re-fetches                                                                                                     |
| 6   | Update doesn't reorder                | `cartLinesUpdate` on an old line leaves it in place                                                                                                                                           |
| 7   | **No quantity ceiling**               | `cartLinesUpdate` to `9999` succeeded, `userErrors: []`. The 1–10 limit is entirely ours                                                                                                      |
| 8   | **Quantity 0 deletes**                | `cartLinesUpdate` with `quantity: 0` removes the line, and the line id is then dead                                                                                                           |
| 9   | Negative quantity                     | `quantity: -1` → `userErrors[0].code: "INVALID"`, message "The cart line … does not exist." (the line was already gone from test 8)                                                           |
| 10  | **Bad merchandise id**                | → `code: "INVALID_MERCHANDISE_LINE"`, `field: ["lines","0","merchandiseId"]` — the code named in the spec is real                                                                             |
| 11  | Bad line id on remove                 | → `code: "INVALID"`, `field: ["lineIds","0"]`                                                                                                                                                 |
| 12  | **Dead cart id on mutate**            | → `code: "INVALID"`, `field: ["cartId"]`, "The specified cart does not exist.", `cart: null`                                                                                                  |
| 13  | **Dead or malformed cart id on read** | `cart(id)` returns `data.cart: null` with **no GraphQL error**, even for `"not-a-gid"`. Recovery is a plain null check                                                                        |
| 14  | Emptied cart survives                 | Removing every line leaves a usable cart: same id, `totalQuantity: 0`, `checkoutUrl` intact. **Keep the cookie**                                                                              |
| 15  | **Subtotal is plain arithmetic**      | `cost.subtotalAmount` exactly equals `Σ (line.cost.amountPerQuantity × quantity)`; `totalTaxAmount` is `null`. An optimistic subtotal can be computed client-side with no drift               |
| 16  | Line fields available                 | `cost.amountPerQuantity`, `cost.compareAtAmountPerQuantity`, and `merchandise { id title image price compareAtPrice selectedOptions product { handle title } }` — everything `CartLine` needs |
| 17  | `checkoutUrl`                         | `https://apparel-outdoor.hydrogen.mock.shop/checkout` — constant, mocked, not cart-specific                                                                                                   |

Facts 4, 5, 7 and 8 are the ones that shape the reducer. Fact 15 is what makes an honest optimistic subtotal possible.

### Cookies (Next.js 16.3.5 bundled docs + a local round-trip test)

- `cookies()` is **async**. Reading works in Server Components; **`.set`/`.delete` only work in a Server Function or Route Handler**, because HTTP can't set cookies once streaming has started.
- **Verified locally**: `next/dist/compiled/cookie` URI-encodes on `serialize` and decodes on `parse`, so the `://` and `?key=` in the cart id round-trip exactly with **no manual encoding**. Full `Set-Cookie` header: 156 bytes, far under the 4 KB limit.
- `cookies()` is a Request-time API: using it in a layout or page **opts the route into dynamic rendering**.
- **Setting a cookie in a Server Action automatically re-renders the current page.** This fires on the _first_ add (when the cart is created) and not on later mutations, because only the create path writes the cookie.

### Server Actions (Next.js 16.3.5 bundled docs)

- **Actions are dispatched one at a time per client.** Three rapid clicks queue sequentially; `Promise.all` does not parallelize them. Good for cart consistency, but it means one round trip per click unless we debounce.
- An action is a public POST endpoint. Framework protections: Origin/Host CSRF check, 1 MB body cap, encrypted action ids, closure encryption.
- The guide's core rule fits the cart exactly: _"Send a reference (typically an ID) plus the user's change, and re-read the rest from a trusted source using the session."_ Here the httpOnly cookie **is** the session.
- Revalidation choices: `updateTag` (immediate, read-your-own-writes), `revalidateTag` (stale-while-revalidate, no immediate re-render), `revalidatePath`, `refresh`. An action that calls none of them returns only its value and does not re-render the route — **which is what we want**.

### `useOptimistic` (React 19, react.dev reference)

- `useOptimistic(value, reducer)`: the setter must be called **inside a transition**; outside one React warns and the optimistic state flashes.
- **Reducer pattern re-runs on base change**: "If `items` changes while the Action is pending, React re-runs your `reducer` with the new `items`." Optimistic edits stay on top of the freshest data.
- **Rollback, verbatim**: "If the Action throws an error, the Transition still ends, and React renders with whatever `value` currently is. Since the parent typically only updates `value` on success, a failure means `value` hasn't changed, so the UI shows what it showed before the optimistic update."
- So `userErrors` and network failure converge: neither advances the base, both roll back. We only need `try/catch` to _show a message_, not to undo anything.

### Current build output (verified, `npm run build`, 2026-09-24)

```
┌ ○ /                              1h      1y      ← STATIC
├ ○ /_not-found                    1h      1y
├ ƒ /collections/[handle]                          ← already dynamic
└ ƒ /products/[handle]                             ← already dynamic
```

This bounds the cost of reading the cookie in the root layout: **the only route that loses static prerendering is `/`.** The other two are already dynamic (search params). Catalog data stays `force-cache`d either way, so a dynamic `/` still serves its content from the data cache — the added per-request work is one `no-store` cart query.

## How it fits together

```
  Browser                                    Server
  ───────                                    ──────
  CartProvider  ◄── initialCart (props) ──   layout.tsx
   │  useState(cart)          base             └─ cookies().get('cart_id')
   │  useOptimistic(cart, cartReducer)            └─ getCart() → cart(id) { no-store }
   │                                                  null ⇒ render an empty cart
   ├─ CartCount  (header badge, reads context)
   ├─ CartDrawer (lines, stepper, remove)
   └─ AddToCart  (PDP)
        │
        │ startTransition(async () => {
        │   applyOptimistic({ type:'add', line })   ← instant, pure reducer
        │   const res = await addToCartAction(variantId, qty)
        │   if (res.ok) startTransition(() => setCart(res.cart))   ← base advances
        │   else setError(res.error)                ← base unchanged ⇒ auto rollback
        │ })
        ▼
   Server Action ─ cookies().get → cartCreate | cartLinesAdd/Update/Remove ─▶ mock.shop
                   sets the cookie only when a cart is created
```

The reducer is used in two places and is the same pure function in both: React applies it optimistically in the browser, and unit tests call it directly.

## Alternatives and trade-offs

### Where the cart id lives

| Option                           | For                                                                              | Against                                                                                                      | Verdict                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **httpOnly cookie**              | XSS can't read the id; SSR count with no mismatch; server is the only API caller | `/` becomes dynamic; mutations need a server round trip                                                      | **Recommended**                                                                                                                               |
| Readable cookie / `localStorage` | Client can call the API directly; `/` stays static                               | The id is a bearer token exposed to any injected script; count flickers `0 → N` on every load, or mismatches | Rejected — contradicts §5.3's "restored on reload" without flicker, and weakens a project that already makes a security story of sanitization |
| `localStorage` only              | Survives cookie clearing UX                                                      | Unreadable on the server, so the count can never be server-rendered                                          | Rejected                                                                                                                                      |

### How optimistic updates are applied

| Option                                    | For                                                                                                                                | Against                                                                                                                                                                                                                                                               | Verdict                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **`useOptimistic` + pure reducer**        | Rollback is free and framework-guaranteed; reducer is pure, so `lib/cart` unit tests need no React; reducer re-runs on base change | Setter must be inside a transition; needs a client provider                                                                                                                                                                                                           | **Recommended**                                                                                |
| Apollo `optimisticResponse`               | Already in the stack; `apollo-nextjs.md` reserved the client cache for the cart                                                    | Requires the cart id in browser JS, which rules out the httpOnly cookie. Also needs a hand-built fake `Cart` response including cost totals — we'd compute the subtotal ourselves anyway, so the reducer reappears inside `optimisticResponse` with worse testability | Rejected — this **reverses the tentative plan in `apollo-nextjs.md`**, confirmed as decision 1 |
| Hand-rolled reducer + `useState` rollback | Total control                                                                                                                      | Re-implements what `useOptimistic` guarantees, including correct behaviour under rapid clicks; more code, more edge cases                                                                                                                                             | Rejected                                                                                       |

### How the base state advances after a mutation

| Option                                             | Cost per click                                                         | Consistency                                                  | Verdict                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Action returns the cart; provider `setCart`**    | One POST, small JSON                                                   | Client is authoritative after mount; a second tab goes stale | **Recommended**                                                         |
| `refresh()` / `revalidatePath`, base = server prop | One POST **plus a full re-rendered RSC payload for the current route** | Always matches the server                                    | Rejected for cost — a quantity click shouldn't re-render a product page |

### Keeping `/` static

Only `/` is affected. Three ways out:

1. **Accept the dynamic `/`** and wrap the cart read in `<Suspense>` so the header shell and page content stream without waiting on the cart query. Measure LCP before/after and record it, as the image work did. — **Chosen (decision 2).**
2. **Revisit Cache Components.** `apollo-nextjs.md` decision 2 kept `cacheComponents` off and said to revisit it "when we want PPR / static shells". This is arguably that moment: a prerendered shell with the cart streaming in is the textbook PPR case. **Deferred to the performance phase** — it is a larger change that touches the Apollo RSC integration, and it stays out of the cart feature even if the LCP measurement moves.
3. Store `totalQuantity` in a second readable cookie and render the badge without an API call. Rejected: it still makes the route dynamic, and it adds a counter that can drift from server truth.

## Implementation outline

### 1. Files

```
src/lib/cart/
  cookie.ts            read/write the cart-id cookie (server-only)
  reducer.ts           pure: optimistic intents → next Cart
  reducer.test.ts
  limits.ts            MIN/MAX_QUANTITY, clampQuantity, canAddToLine (shared guard)
  mappers.ts           generated CartFragment → domain Cart
  mappers.test.ts
  actions.ts           'use server' — add / update / remove
src/components/organisms/CartDrawer/
src/components/organisms/CartProvider/     'use client' context
src/lib/graphql/documents/cart.graphql
src/types/cart.ts
```

### 2. Domain types (project overview §7)

```ts
export interface CartLine {
  id: string;
  variantId: string;
  title: string; // product title
  options: SelectedOption[];
  image: Image | null;
  quantity: number;
  unitPrice: Money; // cost.amountPerQuantity — needed to recompute subtotal optimistically
  lineTotal: Money;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  subtotal: Money;
  totalQuantity: number;
  checkoutUrl: string;
}
```

`unitPrice` is an addition to §7's sketch. It is what makes fact 15 usable: without it the reducer can't produce an honest subtotal and would have to show a stale one.

### 3. The cookie

```ts
// src/lib/cart/cookie.ts
import "server-only";
import { cookies } from "next/headers";

const CART_COOKIE = "cart_id";
// Below Shopify's cart retention; a stale id is handled by the null check either way.
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function readCartId(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

// Server Actions / Route Handlers only. Values are URI-encoded by Next (verified).
export async function writeCartId(id: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}
```

### 4. The reducer (the unit-tested core)

Intents mirror the three mutations. The reducer encodes facts 4, 5 and 8.

```ts
// src/lib/cart/reducer.ts  — pure, no React, no GraphQL
export type CartIntent =
  | { type: "add"; line: Omit<CartLine, "id" | "lineTotal"> }
  | { type: "setQuantity"; lineId: string; quantity: number }
  | { type: "remove"; lineId: string };

export function cartReducer(cart: Cart, intent: CartIntent): Cart {
  /* … */
}
```

Rules it must implement, each traceable to an observation:

- **`add` merges by `variantId`** and sums quantities (fact 4). It does **not** decide the 1–10 question: per decision 4 an over-limit add is refused before any intent is dispatched, by `canAddToLine` below. The reducer still clamps defensively so it stays total, but that clamp should never be the thing the user sees.
- A genuinely new line is **prepended**, not appended, so the optimistic order matches the server's newest-first order (fact 5) and the list doesn't visibly re-sort when the real cart arrives.
- A new line needs a placeholder id (e.g. `optimistic:<variantId>`); it is replaced wholesale when the base advances.
- **`setQuantity` to 0 removes the line** (fact 8), so the stepper's lower bound and the remove button agree.
- Subtotal and `totalQuantity` are recomputed from the lines (fact 15), never patched incrementally.

### 4b. The shared limit guard

Decision 4 means the ceiling has to be answered **before** the optimistic update runs, not repaired afterwards. That answer is one pure function, called from two places:

```ts
// src/lib/cart/limits.ts — pure
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 10;

export type AddCheck = { ok: true; quantity: number } | { ok: false; reason: "at-maximum" };

/** Existing line quantity + requested, against MAX_QUANTITY. */
export function canAddToLine(cart: Cart, variantId: string, requested: number): AddCheck;
```

- The **client** calls it against the cart already in context, so the refusal is instant and costs no request. Nothing is dispatched, so nothing has to roll back.
- The **Server Action** calls it again against a freshly read cart. Per the Next.js guidance, the client's view of the cart is not a trusted source.

### 5. The Server Action

```ts
// src/lib/cart/actions.ts
"use server";

export type CartActionResult = { ok: true; cart: Cart } | { ok: false; error: string };

export async function addToCart(variantId: string, quantity: number): Promise<CartActionResult> {
  const requested = clampQuantity(quantity); // never trust the caller
  const cartId = await readCartId(); // the id never comes from the client

  // No cart yet: nothing can be over the limit.
  if (!cartId) return await createCartWithLine(variantId, requested);

  const current = await getCart(cartId); // fact 13: null when expired or bogus
  if (!current) return await createCartWithLine(variantId, requested);

  const check = canAddToLine(current, variantId, requested);
  if (!check.ok) {
    return { ok: false, error: `You can have at most ${MAX_QUANTITY} of this item in the cart.` };
  }

  const existing = current.lines.find((line) => line.variantId === variantId);

  // When the line exists, set the absolute quantity rather than adding. `cartLinesAdd` is
  // additive (fact 4), so an absolute update is the only form that can't overshoot the
  // ceiling, and it is safe to retry.
  const result = existing
    ? await cartLinesUpdate(cartId, existing.id, check.quantity)
    : await cartLinesAdd(cartId, variantId, check.quantity);

  // Dead or expired cart (fact 12): start a fresh one instead of failing the click.
  if (!result.ok && result.code === "INVALID" && result.field?.includes("cartId")) {
    return await createCartWithLine(variantId, requested);
  }
  return result;
}

// Creates the cart and writes the cookie. The cookie is written only here, on create.
async function createCartWithLine(variantId: string, quantity: number): Promise<CartActionResult> {
  const created = await cartCreate(variantId, quantity);
  if (created.ok) await writeCartId(created.cart.id);
  return created;
}
```

Three details worth stating:

- **The ceiling costs one extra read.** Refusing rather than clamping (decision 4) means the action must know the current line quantity before it mutates, so an add against an existing cart is `cart(id)` followed by one mutation. The client-side `canAddToLine` check means the refusal path almost never reaches the server; this read is the trust boundary, not the UX.
- **Existing lines use `cartLinesUpdate`, not `cartLinesAdd`.** Once the target quantity is known, an absolute update sidesteps fact 4's additive merge entirely. `cartLinesAdd` is then only ever used for a variant that is not yet in the cart.
- **Every mutation must check `userErrors`** as well as network failure, and map them to short user-facing text — `INVALID_MERCHANDISE_LINE` (fact 10) becomes something like "That option is no longer available", never the raw message.

### 6. Layout and provider

`layout.tsx` reads the cookie, fetches the cart with `context: { fetchOptions: { cache: "no-store" } }` (the per-query override `apollo-nextjs.md` decision 4 already provides for), treats `null` as an empty cart (fact 13), and renders `<CartProvider initialCart={cart}>` around the header and children. Wrap the cart read in `<Suspense>` with a badge fallback that reserves its own space, so the cart query doesn't block the shell and doesn't cause CLS.

The provider holds `useState(initialCart)` as the base and `useOptimistic(cart, cartReducer)` for display. It ignores later `initialCart` prop changes: after mount the action return value is authoritative. The one re-render the cookie write triggers on first add is therefore harmless but redundant — worth a comment so the next reader doesn't think it's load-bearing.

### 7. Debounce the stepper

Because actions dispatch sequentially, holding `+` queues one round trip per press. The existing `QuantityStepper` already keeps draft state; extend that so the optimistic reducer runs per click while the action fires for the settled value after **300 ms** (decision 5). Rapid clicks then cost one mutation, and `useOptimistic`'s reducer-on-latest-base behaviour keeps the display right throughout.

### 8. Steps

1. `cart.graphql` documents + fragments, `npm run codegen`.
2. `src/types/cart.ts`, `mappers.ts`, `limits.ts`, `cookie.ts`.
3. `reducer.ts` + tests — this is the bulk of the logic, write it before any UI.
4. `actions.ts` with `userErrors` mapping and the dead-cart recovery path.
5. `CartProvider`, then `CartCount` in the header, then `CartDrawer`.
6. Wire `AddToCart` on the PDP (replacing the inert button).
7. E2E + axe.

## Testing strategy

**Unit — `src/lib/cart/` (the ≥ 80% gate lands here).** The reducer takes fixtures in and gives a `Cart` out, so every rule above is a direct assertion: merge-on-add by `variantId`; new lines prepended; `setQuantity(0)` removes; subtotal and `totalQuantity` recomputed; empty-cart and single-line edges; and that the reducer never mutates its input (the `EMPTY_FACETS` regression in PR #14 is the reason to assert this explicitly). Mappers get a test against a real captured response. Cookie helpers: round-trip, and absent-cookie → `null`.

`canAddToLine` gets its own table: under the limit passes; exactly at the limit (`10 + 1`) refuses; **an add that would overshoot (`8 + 5`) refuses outright rather than landing on 10** (decision 4); a variant not yet in the cart is judged on the requested amount alone; and a request above `MAX_QUANTITY` on an empty cart refuses. These cases are the decision, so they are the ones that must fail loudly if someone later reintroduces clamping.

**Component (RTL + MSW).** Drawer renders lines, quantities and subtotal; the stepper is bounded at 1 and 10; **the optimistic path** — assert the new quantity is on screen _before_ the mocked mutation resolves, then assert it stays after; **the rollback path** — MSW returns `userErrors: [{ code: "INVALID_MERCHANDISE_LINE" }]` and a network error, and in both cases the old quantity returns and a message appears. **the refusal path** — with a line already at 10, pressing add shows the maximum message, fires **no** mutation (assert the MSW handler was not called) and leaves the quantity untouched. Fake timers for the 300 ms debounce, including that holding `+` five times sends one mutation carrying the final value, not five. Add-to-cart from the PDP opens the drawer and moves focus, reusing `useModalDialog`.

**E2E (Playwright, real API).** Add → update → remove, then **reload and assert the cart survives** (the cookie's whole purpose). Also: add the same variant twice and assert one merged line, not two (fact 4). Axe on the open drawer. Cart badge count is correct in server-rendered HTML — assert against the initial response, not the hydrated DOM, which is the only way to prove there's no mismatch.

**Not worth testing:** discount codes (always `applicable: false`) and out-of-stock adds (0/360 unavailable variants), consistent with how the product page handled unreachable states.

## Risks / open questions

1. **`/` goes dynamic** (accepted, decision 2). Verified as the only static route today. Measure LCP before/after and record the numbers, as `image-performance.md` did. If the Lighthouse ≥ 90 budget slips, that is input to the performance phase's Cache Components work — not a reason to reopen the cookie decision.
2. **Cart expiry is untested.** Shopify carts expire after inactivity; the exact window was not verified here, and the 7-day `maxAge` is a guess. It doesn't matter much — fact 13 shows an expired id reads back as `null` with no error, so the failure mode is a silently fresh cart.
3. **Cross-tab staleness.** Two tabs each hold their own base state. A `storage` event or polling would fix it; out of scope, and worth a README note.
4. **Placeholder ids leak if the base never advances.** If an add fails, the optimistic line disappears on rollback — correct, but confirm the drawer doesn't keep a stale `optimistic:` key in a list animation.
5. **`ApolloWrapper` is now load-bearing for one feature only.** Decision 1 reverses `apollo-nextjs.md` decision 4, so the client Apollo cache serves predictive search and nothing else. The search feature must confirm it still needs it; if that feature also ends up server-driven, the provider should come out rather than ship unused.
6. **The extra read on add is unmeasured.** Decision 4 makes an add against an existing cart two sequential API calls. At mock.shop's ~0.24 s that is roughly half a second before the action resolves. The optimistic UI hides it, but it widens the window in which a refusal surfaces after the user has already moved on. Worth timing once the drawer exists.
7. **Assumption:** `cost.amountPerQuantity` was `null` on no line I saw, but I only checked a handful. The mapper should fall back to `merchandise.price` rather than trusting it.

## Sources

- **Live API**, `https://apparel-outdoor.mock.shop/api`, 2026-09-24 — 22 probes covering `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `cart(id)`, and the error paths in facts 9–13.
- **Next.js 16.3.5 bundled docs**, `node_modules/next/dist/docs/`: `01-app/03-api-reference/04-functions/cookies.md`, `01-app/02-guides/server-actions.md`, `01-app/02-guides/interactive-apps.md`.
- **React 19 `useOptimistic`** — react.dev reference, via Context7 `/reactjs/react.dev`.
- **Local verification**: `next/dist/compiled/cookie` encode/decode round-trip; `npm run build` route table.
- **`schema.graphql`** (committed) — `CartUserError`, `CartErrorCode`.
- Prior research: `docs/apollo-nextjs.md` (decisions 2 and 4).
