# Summit Drift Storefront

[![CI](https://github.com/mvukalov/summit-drift-storefront/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mvukalov/summit-drift-storefront/actions/workflows/ci.yml)

A headless storefront for Summit Drift Outfitters, a fictional outdoor brand, built with Next.js on the Shopify Storefront GraphQL API ([mock.shop](https://mock.shop)).

This project was built for portfolio purposes to practice production-style frontend work: a typed GraphQL data layer, server-first rendering, an accessible component library, optimistic UI with rollback, and a test-driven workflow with CI on every pull request.

## Live Demo

https://summit-drift-storefront.vercel.app/

The checkout button leads to mock.shop's demo checkout page: no payment is taken and nothing ships. The cart itself is real, backed by the Storefront cart API.

## Features

- Home page and collection pages with navigation driven by the API
- Collection sorting and derived facets (filters), with all state kept in the URL so links are shareable
- Product page with image gallery, variant picker (selection in the URL), quantity stepper, sanitized rich-text description, and `Product` / `BreadcrumbList` JSON-LD
- Cart drawer with instant add / update / remove, automatic rollback on failure, and a per-line quantity limit
- Cart persisted in an httpOnly cookie, so it survives reloads; the header count is rendered on the server
- Loading, error and not-found states per route
- Accessible by design: semantic markup, keyboard and focus management, visible focus states, touch targets of at least 44px

## Tech Stack

- Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript (strict)
- SCSS Modules with design tokens
- Apollo Client with graphql-codegen (typed operations); domain types mapped in `src/lib/`
- Zod for URL and input validation
- sanitize-html behind a single `RichText` atom
- Vitest and React Testing Library, MSW for API mocking
- Storybook for the component library (atoms, molecules, organisms)
- GitHub Actions CI, deployed on Vercel

## Architecture Notes

- **Server first.** Catalog data is fetched in Server Components and mapped to domain types in `src/lib/`; client components receive  plain props. The browser makes no GraphQL requests.
- **URL as state.** Sort, facets and the selected variant live in the URL and are validated on the server.
- **Cart.** The cart id is a bearer token, so it lives in an httpOnly cookie and only Server Actions talk to the cart API. The UI uses `useOptimistic` over a pure reducer (`src/lib/cart/`), which makes the interesting logic unit-testable and lets rollback happen without extra code.
- **One choke point for HTML.** Shopify's `descriptionHtml` is only ever rendered through the `RichText` atom, enforced with ESLint rules.
- **Research before code.** Non-trivial decisions are backed by short research notes in `docs/` (Apollo with Next.js, HTML sanitization, image performance, cart persistence).

## Testing and Quality

- Unit and component tests with Vitest and React Testing Library (700+ tests), including regression tests for bugs found in review
- Lint, typecheck, tests with coverage, and production build run on every pull request
- Every change goes through a pull request; `main` is protected and requires a green CI run

## Project Structure

```
src/
├── app/                # routes, layouts, loading and error states
├── components/
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── hooks/
├── lib/
│   ├── cart/           # cart reducer, Server Actions, cookie, limits
│   ├── catalog/        # fetchers and mappers
│   ├── facets/         # derived facets, sorting, URL state
│   ├── variants/       # variant selection logic
│   ├── sanitize/       # HTML sanitization
│   ├── seo/            # JSON-LD and metadata
│   └── graphql/        # documents, generated types, Apollo clients
├── styles/             # design tokens
└── types/              # domain types
context/                # feature specs and working notes
docs/                   # research and architecture notes
```

## Run Locally

```
npm install
npm run dev
```

The application will be available at http://localhost:3000. Useful scripts:

```
npm run lint
npm run typecheck
npm run test
npm run build
npm run storybook
npm run codegen
```

No environment variables are required. `NEXT_PUBLIC_SITE_URL` sets canonical URLs and defaults to `http://localhost:3000`.

## Planned Improvements

- Search: results page and a predictive combobox
- End-to-end tests with Playwright and axe accessibility checks in CI
- Performance work: Lighthouse budgets in CI and Cache Components (see the LCP note below)
- Storybook deployment

## Trade-offs recorded so far

Decisions that were reversed or deliberately deferred along the way, kept here so they are not lost.

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

## Author

Martin Vukalović

## License

This project is intended for educational and portfolio purposes.
