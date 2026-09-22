# Summit Drift Storefront — Project Overview

A headless storefront for **Summit Drift Outfitters**, a fictional outdoor apparel and gear brand, built on the Shopify Storefront GraphQL API (served by mock.shop).

The goal is a production-quality frontend: typed GraphQL, a themeable design system, tested user flows and measured performance, all verifiable on GitHub.

> Data facts in this file were verified against the live API on 2026-09-19. If something here disagrees with the API, the API wins — update this file.

---

## 1. Problem & Users

- **Problem:** outdoor shoppers need to find the right layer, size and material quickly, on a phone, often on a slow connection.
- **Users:** hikers and commuters browsing on mobile first, desktop second.
- **What the app offers:** fast browsing by collection, product pages with a clear variant picker, search with suggestions, and a cart that responds instantly.

---

## 2. Data Source

|          |                                                                                     |
| -------- | ----------------------------------------------------------------------------------- |
| Endpoint | `https://apparel-outdoor.mock.shop/api` (POST, JSON)                                |
| Auth     | none; send header `X-Shopify-Storefront-Access-Token: public`                       |
| Schema   | Shopify Storefront API; introspection enabled (426 types) → used by graphql-codegen |
| Currency | USD                                                                                 |
| Checkout | mocked (`checkoutUrl` points to a fake checkout)                                    |

### Catalog

30 products, 360 variants, 84 variants on sale, 0 unavailable variants.

| Collection handle          | Title                    | Products | Price range (USD) | Option axes                                                            |
| -------------------------- | ------------------------ | -------- | ----------------- | ---------------------------------------------------------------------- |
| `summit-protection-shells` | Summit Protection Shells | 8        | 25 – 534          | color (slate/moss/clay) × size (XS–L)                                  |
| `trail-foundation-layers`  | Trail Foundation Layers  | 8        | 15 – 64           | size (S–L) × color (charcoal/sand/fern/stone)                          |
| `rugged-traverse-bottoms`  | Rugged Traverse Bottoms  | 8        | 75 – 147          | material (nylon-blend/stretch-canvas/soft-shell) × size (30–36)        |
| `expedition-field-gear`    | Expedition Field Gear    | 6        | 38 – 285          | finish (matte/weather-resistant/breathable) × size (small–extra-large) |

Menu `main-menu`: Home + the four collections.

### Data quirks (handle in code, don't "fix" the data)

- Option names are **lowercase** (`color`, `size`) and value casing varies (`XS` vs `small`). Normalize for display.
- Options are identical within a collection, and some are odd (trekking poles with sizes S–XL). It's demo data; the UI must stay generic.
- `description` is plain text; `descriptionHtml` contains HTML (`<p>`, `<ul>`). Rendering it requires **sanitization** (XSS).
- `quantityAvailable` is `null`, and the API accepts any quantity (tested with 9999). **Quantity limits are a frontend rule.**
- **Images:** 2–3 per product (79 total), all PNG sources, 768×1344 portrait (4:7), **~1.4 MB each as PNG**. Collection images reuse product images but report `width/height: null`. All variants of a product use its featured image.
  - The Shopify CDN **negotiates the format on the `Accept` header** (`vary: Accept`). Browsers that accept WebP get a full-size WebP of **~56–89 KB**. Clients without WebP in `Accept` (curl, Next's server-side fetch) get the 1.4 MB PNG. Shopify never serves AVIF (verified 2026-09-22).
  - `&width=` resizes but never upscales past 768 px. `preferredContentType: WEBP` and `&format=webp` change nothing; the format comes from `Accept`.
  - `next/image` (AVIF/WebP at the rendered width) is still ~4–13× smaller than Shopify's full-size WebP. Details and numbers: `docs/image-performance.md`.

### API capabilities (tested)

| Capability                               | Status | Notes                                                                             |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Products, collections, product by handle | ✅     |                                                                                   |
| Cursor pagination (forward/back)         | ✅     | `first/after`, `last/before`                                                      |
| Collection sort                          | ✅     | `PRICE`, `BEST_SELLING`, `CREATED`, `reverse`                                     |
| Search                                   | ✅     | `search(query, types: PRODUCT)` with `totalCount`, sort, pagination               |
| Predictive search                        | ✅     | `predictiveSearch(query, limit)`                                                  |
| Recommendations                          | ✅     | `productRecommendations(productId)`                                               |
| Menu, SEO fields                         | ✅     | `menu(handle)`, `seo { title description }`                                       |
| Cart                                     | ✅     | `cartCreate`, `cartLinesAdd/Update/Remove`, `cart(id)`; cart persists server-side |
| Cart errors                              | ✅     | invalid merchandise → `userErrors` with code `INVALID_MERCHANDISE_LINE`           |
| Discount codes                           | ⚠️     | accepted but always `applicable: false`                                           |
| **Server-side filters**                  | ❌     | `filters:` input and `query:` syntax are ignored; `productFilters` is empty       |
| Localization                             | ❌     | single market and language                                                        |
| Customer accounts                        | ❌     | not available on mock.shop                                                        |

---

## 3. Features (MVP)

| #   | Page / feature                         | Key behaviour                                                                                                                                           |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Home**                               | Hero, the four collections with images, featured and on-sale products. SSR.                                                                             |
| 2   | **Collection** `/collections/[handle]` | Product grid, sort, facets (see §5.1). Facets and sort live in the URL. Canonical URL without filter params (§5.5). SSR.                                |
| 3   | **Product** `/products/[handle]`       | Image gallery, variant picker (§5.2), sale price, sanitized description, recommendations. SSR + SEO metadata + Product structured data (JSON-LD, §5.5). |
| 4   | **Search** `/search?q=`                | Header combobox with predictive suggestions (debounced, keyboard + ARIA). Results page with total count, sort and pagination.                           |
| 5   | **Cart drawer**                        | Add, update quantity, remove with optimistic UI and rollback (§5.3). Cart id in a cookie. Link to the mock checkout.                                    |
| 6   | **Design system**                      | Atomic components in Storybook, themed with design tokens.                                                                                              |

### Out of scope (→ `new-feature-list.md`)

Customer accounts, real checkout, wishlist, i18n and multi-currency, blog/CMS pages, reviews, multi-store theming.

---

## 4. Tech Stack

| Layer                  | Choice                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Framework              | Next.js 16 (App Router, React Server Components)                                                                            |
| Language               | TypeScript, `strict`, no `any`                                                                                              |
| UI                     | React 19                                                                                                                    |
| Styling                | SCSS Modules + design tokens as CSS custom properties. No Tailwind.                                                         |
| Components             | Atomic structure (atoms → molecules → organisms), documented in Storybook                                                   |
| Data                   | GraphQL: Apollo Client via the official Next.js App Router integration; graphql-codegen (client preset) for typed documents |
| Validation             | Zod (URL search params, env)                                                                                                |
| Sanitization           | DOMPurify-compatible sanitizer for `descriptionHtml`                                                                        |
| Unit / component tests | Vitest + React Testing Library                                                                                              |
| E2E                    | Playwright + @axe-core/playwright                                                                                           |
| Performance            | Lighthouse CI with budgets                                                                                                  |
| CI                     | GitHub Actions                                                                                                              |
| Container              | Dockerfile for production build                                                                                             |
| Deploy                 | Vercel (app) + Storybook (static deploy)                                                                                    |

> Library versions and the exact Apollo ↔ App Router setup are confirmed via Context7 at bootstrap. Don't assume APIs from memory.

---

## 5. Hard Problems (the interview stories)

### 5.1 Facets derived from data, state in the URL

The API ignores filters, so the server fetches the whole collection (≤ 250 products in one request; here ≤ 8) and computes facets itself.

- **Facets:** option values (color, size, material, finish), price range, "on sale".
- **Counts** per facet value reflect the other active facets (standard faceted-search behaviour).
- **State lives in search params:** `?color=moss&size=M&sale=1&sort=price-asc`. Links are shareable, back/forward works, and the page renders on the server.
- **Pure functions** in `src/lib/facets/` (derive, apply, serialize/parse URL) → fully unit-tested.
- **Documented limit:** this approach holds up to one page of products (250). Beyond that, a real search backend is needed. This goes in the README trade-offs.

### 5.2 Variant picker

- Options matrix → exact variant via `selectedOptions`.
- Selected variant is in the URL (`?variant=` or option params), so it is shareable and SSR-correct.
- Price and compare-at price update with the variant; the image switches when the variant has its own image.
- Unavailable combinations are disabled. This is implemented and unit-tested even though this catalog has none.
- Accessible: radio-group semantics, keyboard navigation.

### 5.3 Optimistic cart with rollback

- UI updates immediately, then the mutation runs.
- On network error or `userErrors`, state rolls back and the user sees a message.
- Quantity limits (1–10 per line) are enforced client-side because the API has none.
- The cart id persists in a cookie and is restored on reload.
- Tested: unit (reducer/rollback), component (drawer), E2E (add → update → remove).

### 5.4 Image performance (measured)

Product images are 1.4 MB PNG sources; browsers get a full-size ~56–89 KB WebP from the Shopify CDN (see §2).

- Plan: `next/image` with `remotePatterns` for `cdn.shopify.com`, correct `sizes`, AVIF/WebP, `fetchPriority="high"` on the LCP image, reserved aspect ratio (768×1344) to avoid CLS.
- **Measure before/after** (Lighthouse: LCP, total image bytes, CLS) and record the numbers in the README.

### 5.5 SEO: canonical URLs and structured data

- **Canonical URLs.** Facets and sort put many URL variants on one collection (`?color=moss&size=M&sort=price-asc`). Every collection page sets `<link rel="canonical">` to the clean collection URL (via `generateMetadata` → `alternates.canonical`), so filter combinations don't create duplicate content. Search result pages are `noindex`.
- **Product structured data.** Each PDP renders a JSON-LD `Product` block (schema.org): name, description (plain text), images, SKU, brand, and an `Offer`/`AggregateOffer` with price, `priceCurrency` (USD) and `availability`, built from the same GraphQL data as the page. Collection pages render a `BreadcrumbList`.
- **Verified**, not assumed: JSON-LD is validated in a unit test (shape) and checked once with Google's Rich Results Test; canonical tags are asserted in an E2E test.

---

## 6. Architecture

```
Browser
  │
  ▼
Next.js 16 (Vercel)
  ├─ app/                    routes: /, /collections/[handle], /products/[handle], /search
  │    └─ Server Components  fetch via Apollo (RSC) → HTML with data (SEO, fast LCP)
  ├─ components/
  │    ├─ atoms/             Button, Price, Badge, Swatch, Input, Spinner…
  │    ├─ molecules/         ProductCard, FacetGroup, QuantityStepper, SearchCombobox…
  │    └─ organisms/         ProductGrid, VariantPicker, CartDrawer, Header…
  ├─ lib/
  │    ├─ graphql/           documents (*.graphql), generated types, Apollo clients
  │    ├─ facets/            pure: derive / apply / URL serialize
  │    ├─ cart/              reducer, optimistic logic, cookie helpers
  │    └─ format/            money, option-name normalization
  ├─ styles/
  │    ├─ tokens.scss        colors, typography, spacing, radii, shadows
  │    └─ mixins, breakpoints
  └─ Client Components       only where needed: cart, variant picker, search combobox, facets UI
        │
        ▼
Shopify Storefront GraphQL API (apparel-outdoor.mock.shop)
```

### Rules

- **Server Components by default.** `'use client'` only for interactivity.
- **All GraphQL goes through typed documents** from codegen. No hand-written response types.
- **Business logic lives in `lib/` as pure TypeScript** (no React imports) so it is unit-testable.
- **No inline styles.** Components only use tokens; no hard-coded colors or spacing.

---

## 7. Domain Types (derived from generated GraphQL types)

```ts
ProductCard   { handle, title, image, price, compareAtPrice?, isOnSale }
ProductDetail { ...ProductCard, descriptionHtml (sanitized), images[], options[], variants[] }
Variant       { id, selectedOptions: {name, value}[], price, compareAtPrice?, available, image? }
Facet         { key, label, type: 'option' | 'price' | 'boolean', values: {value, label, count, active}[] }
CartLine      { id, variantId, title, options, image, quantity, lineTotal }
Cart          { id, lines: CartLine[], subtotal, totalQuantity, checkoutUrl }
```

---

## 8. UI / UX

- **Mood from the catalog:** earthy, muted palette (slate, moss, clay, sand, fern, stone), rugged and technical. Tokens are built from these names.
- **Mobile first**, tested at 375 / 768 / 1280.
- **Accessibility target:** WCAG 2.2 AA. Visible focus, full keyboard support, 44px touch targets, no information conveyed by color alone (color swatches also have text labels).
- Loading skeletons for grids; empty and error states for every page.

---

## 9. Quality Gates

**Local, before commit:** `lint`, `typecheck`, `test`, `build`.

**CI on every PR (GitHub Actions):**

1. Lint + typecheck
2. Vitest with coverage threshold (≥ 80% on `lib/`, fails the build below)
3. Playwright E2E + axe (0 serious/critical violations)
4. Lighthouse CI budgets on Home, Collection and Product:
   - Performance ≥ 90, Accessibility ≥ 95
   - LCP < 2.5 s, CLS < 0.1

**Evidence on GitHub:** CI badge, deployed app and Storybook links, PR history, README with decisions, trade-offs and before/after performance numbers.

---

## 10. Open Research (first `/research` tasks)

1. Apollo Client + Next.js 16 App Router: current official integration, RSC vs client usage, caching and revalidation.
2. Cart persistence: cookie strategy, reading the cart in Server Components, avoiding hydration mismatch.
3. `next/image` with Shopify CDN: `remotePatterns`, `sizes`, AVIF; confirm the before/after measurement method.
4. HTML sanitization in RSC for `descriptionHtml`: library choice and bundle impact.
