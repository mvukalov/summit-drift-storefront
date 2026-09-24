# Summit Drift Storefront

[![CI](https://github.com/mvukalov/summit-drift-storefront/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mvukalov/summit-drift-storefront/actions/workflows/ci.yml)

A headless storefront for Summit Drift Outfitters, a fictional outdoor brand, built with Next.js on the Shopify Storefront GraphQL API (mock.shop).

The full README (setup, architecture, decisions, trade-offs and performance numbers) comes in a later feature.

## Trade-offs recorded so far

The full write-up lands with the README feature; these are the decisions that were reversed or
deliberately deferred along the way, kept here so they are not lost.

- **The cart does not use the client-side Apollo cache.** `docs/apollo-nextjs.md` decision 4
  originally reserved it for exactly that. The cart id carries a `?key=` and is therefore a
  bearer token, so it belongs in an httpOnly cookie — which browser JavaScript cannot read, so
  the browser cannot call the cart API. Cart mutations are Server Actions and the optimistic UI
  runs on React's `useOptimistic` over a pure reducer instead. Cost: a server round trip per
  change. Benefit: an XSS cannot steal the cart, and the header count is server-rendered with
  no hydration mismatch and no 0 → N flicker. See `docs/cart.md` decision 1.
- **The cart is not synchronised across tabs.** Two tabs each keep their own base state, so a
  change in one is invisible to the other until a reload. A `storage` event or polling would
  fix it; it is out of scope while the cart is single-session demo data.
- **Adding to an existing line has a read-then-write race.** `addToCart` in `lib/cart/actions.ts`
  reads a line's current quantity, then writes an absolute total computed from it. Two
  overlapping calls for the same variant — two tabs, or a retry racing the original — both read
  the same starting quantity and each write the same total, so one caller's addition is silently
  lost. Same root cause as the cross-tab staleness above: the cart has no server-side
  compare-and-swap, so nothing here can detect the collision, only reduce its window. Accepted
  as a known limitation rather than fixed, since closing it would need either a real concurrency
  primitive the API doesn't offer, or switching the existing-line case back to the additive
  `cartLinesAdd`, which reopens decision 4's overflow problem instead.
- **Reading the cart makes every route dynamic, and the cart read is not wrapped in
  `<Suspense>`.** `/` was the only statically prerendered route and no longer is. Streaming the
  cart would require moving cart state out of React context (a component that calls `use()`
  suspends everything it renders, including the page), so the layout awaits it instead. Measured
  on the same machine and method, Lighthouse mobile, median of 5:

  |                 | Before (static `/`) | After, no cart | After, holding a cart |
  | --------------- | ------------------- | -------------- | --------------------- |
  | Performance     | 93                  | 93             | 92                    |
  | LCP             | 3.24 s              | 3.18 s         | 3.31 s                |
  | CLS             | 0                   | 0              | 0                     |
  | Server response | —                   | 24 ms          | 271 ms                |

  A visitor without a cart pays nothing: the read returns early before any request. A visitor
  holding one pays ~250 ms of server response, which is the whole cost of the decision and lands
  on TTFB rather than rendering. Cache Components would recover it by streaming the cart into a
  static shell; that is deferred to the performance phase. Full write-up and the options
  considered: `docs/cart.md`.

- **LCP is above the 2.5 s target on `/`, and was before the cart.** The baseline measured
  3.24 s with 86% of it render delay and only 44 KB of images, so this is a
  JavaScript/render-time problem, not an image or data one. Pre-existing, untouched by the cart,
  and input for the performance phase.
