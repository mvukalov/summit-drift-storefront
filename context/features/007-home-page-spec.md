# Home Page Spec

## Overview

Replace the temporary collection-title list on `/` (in place since `graphql-layer`) with the real Home page from `project-overview.md` §3: hero, the four collections with images, and a featured/on-sale product grid — SSR, built on the tokens/atoms/header that now exist. This is also the first feature to render real images, so it's where `next/image` gets wired up per `docs/image-performance.md`.

## Requirements

- Hero: eyebrow label, headline, subtext (static marketing copy — no CMS in this project), a primary CTA ("Shop the collection") and secondary CTA ("Shop sale"), hero image.
- Collections section: the four real collections (image, title) from `getCollections()`, each linking to `/collections/[handle]`.
- Featured section: a real product grid with one product from each of the four collections (new standalone query), showing price and an on-sale badge where applicable.
- `src/app/loading.tsx` and `src/app/error.tsx` for `/` (deferred since `graphql-layer`, in scope now).
- `next.config.ts` image config exactly per `docs/image-performance.md`'s recommendation (remotePatterns, formats, qualities, deviceSizes/imageSizes, the `IMAGES_UNOPTIMIZED` env toggle for before/after measurement).
- New `ProductImage` atom wrapping `next/image`, and a new `ProductCard` molecule (the project's first molecule) used by the Featured grid.

## Expected Behavior

- Normal load: hero (with a real image), four collection tiles, a row of featured products with price and a "Sale" badge on items where `isOnSale` is true.
- `loading.tsx` shows while the Server Component fetches; `error.tsx` renders if a fetch throws, with `reset()`.
- Exactly one image on the page (the hero) is the LCP candidate and gets `fetchPriority="high"` + `loading="eager"`; the four collection tiles and the featured cards also use `loading="eager"` (no high-priority flag) since they're all above the fold in the mockup — nothing on Home is lazy.
- Collection tiles and product cards link to routes that don't exist yet (`/collections/[handle]`, `/products/[handle]`) and will 404 until `collection-page`/`product-page` ship — same accepted situation as the header/footer nav since `layout-header`.
- Hero CTAs are real, working links, just not to pages that don't exist: "Shop the collection" anchors to `#collections`, "Shop sale" anchors to `#featured` (there's no sale filter without `facets`, so this is the honest destination today).
- No GraphQL requests from the browser — still a Server Component, same principle as `graphql-layer`.

## Technical

### Images (`docs/image-performance.md`)

- `next.config.ts`:
  ```ts
  images: {
    unoptimized: process.env.IMAGES_UNOPTIMIZED === "1",
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/1/0926/**" },
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/mock-shop-production-media/apparel-outdoor/**", search: "" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    deviceSizes: [640, 750, 828],
    imageSizes: [256, 384],
  }
  ```
- `src/components/atoms/ProductImage/ProductImage.tsx`: thin `next/image` wrapper, always `fill` inside a `.frame` with `aspect-ratio: var(--ratio-product-image)` (new token, `4 / 7` — native catalog ratio, used everywhere on this page since collection images report `null` dimensions anyway). Required props `sizes` and `alt` (falls back to the item's title when `altText` is null/empty). `isLcp?: boolean` maps to `fetchPriority="high"` + `loading="eager"`; otherwise plain `loading="eager"` on this page (nothing lazy on Home). Background `--color-surface-muted` as a loading placeholder.
- `sizes`: featured/product grid cards `"(min-width: 1280px) 304px, (min-width: 768px) 33vw, 50vw"`; collection tiles `"(min-width: 768px) 25vw, 50vw"` — from `docs/image-performance.md`'s table; confirm they still match once the actual grid column counts are implemented (the doc flags them as assumptions pending a real layout).
- Only the hero image is `isLcp`.

### Data

- New GraphQL document `src/lib/graphql/documents/products.graphql`: a standalone `FeaturedProducts` query, `collections(first: 4) { nodes { handle products(first: 1) { nodes { ...ProductCard } } } }` — one product per collection, one round-trip, fully dynamic (no hard-coded handles). Deliberately not `CollectionByHandle` (it fetches `products(first: 250)`, far too much for one product per collection).
- New fetcher `getFeaturedProducts(): Promise<ProductCard[]>` in `src/lib/catalog/fetchers.ts`: flattens the first product of each collection and maps it with the existing `toProductCard` mapper — no new mapper needed. `getCollections()` stays untouched.
- Hero image: the `image` of the `summit-protection-shells` collection, looked up by handle in the `getCollections()` result (already fetched for the Collections section) — no new query. Pinned explicitly, not "first collection in the list", so it doesn't depend on menu/API order; it matches the mockup (a Protection Shells jacket as the hero).
- Hero copy (headline/subtext/eyebrow/CTA labels): static strings in `page.tsx`, not fetched — there's no CMS in this project.

### Components

- `src/components/molecules/ProductCard/ProductCard.tsx` (+ `.module.scss`, `.test.tsx`, `.stories.tsx`): takes the `ProductCard` domain type, renders `ProductImage`, title, `Price` atom, and a `Badge` ("Sale") when `isOnSale`, wrapped in a `Link` to `/products/[handle]`.
- Collection tiles: a simple presentational structure local to `src/app/page.tsx` (image via `ProductImage`, title, `Link` to `/collections/[handle]`) — not a shared molecule; `project-overview.md` §6's molecule list doesn't include one, and nothing else needs it yet.
- `src/app/page.tsx` stays a Server Component: `Promise.all([getCollections(), getFeaturedProducts()])`, renders Hero, `<section id="collections">`, `<section id="featured">`.

## UI

- Reference `context/screenshots/home-desktop-1.png` / `home-mobile-1.png` — direction only, as with every prior feature.
- Grid: Collections and Featured both render as a responsive grid (mobile 2 cols → desktop 4 cols, matching the mockup and the `sizes` strings above).
- Touch targets ≥44px on CTAs, tiles and cards act as full-card links (not just the title text).
- Reduced motion respected for any hover/transition on cards (existing global rule).
- Accessibility: hero headline is the page's `h1`; section headings ("Collections", "Featured") are `h2`; each collection tile/product card image has meaningful `alt` (title fallback per `ProductImage`); the "Sale" badge pairs with the struck-through compare-at price already provided by `Price`, so on-sale is never color-only.

## Testing

- **Unit:** `getFeaturedProducts()` fetcher (MSW, Node env) — reuses the already-tested `toProductCard` mapper, so this test just covers the new query/fetch path. Optional config test asserting real fixture image URLs match the new `remotePatterns` (`docs/image-performance.md`'s suggestion) — catches a new CDN path family before production does.
- **Component (RTL):** `ProductImage` — `sizes`/`alt` render correctly; `isLcp` → `fetchpriority="high"`, no `loading="lazy"`; without it → `loading="eager"` (not `"lazy"`, per this page's "nothing lazy" decision — note the difference from the general lazy-by-default case documented in `docs/image-performance.md`, which is for other pages). `ProductCard` — renders price, shows the Sale badge only when `isOnSale`, links to the right handle. Updated `page.test.tsx` — hero heading, four collection links, featured products including a sale case.
- **`loading.tsx`/`error.tsx`:** render tests, same pattern as established elsewhere in the project (mirrors what `graphql-layer` deferred).
- **Storybook + a11y addon:** `ProductImage` and `ProductCard` stories (default, on-sale, missing alt-text fallback).
- **Manual (this feature, not full E2E yet — that's `e2e-and-a11y`):** dev server — confirm no `/_next/image` 4xx/5xx, hero image's `currentSrc` goes through `/_next/image`, one Chromium request sampled shows `content-type: image/avif`. Before/after: `IMAGES_UNOPTIMIZED=1 npm run build && npm start` vs. optimized build, Lighthouse mobile ×5 median on `/`, record LCP/CLS/image bytes — this is the manual evidence for the PR; wiring `@lhci/cli` as a CI gate is `performance`, not here (routes for the other two Lighthouse URLs don't exist yet).

## Out of Scope

- `@lhci/cli` / Lighthouse CI as an automated PR gate — `performance` feature, once `collection-page` and `product-page` routes exist to budget against.
- `/collections/[handle]` and `/products/[handle]` actually resolving.
- Sale filtering / `#featured` becoming a real filtered view — `facets`.
- PDP gallery image handling (intrinsic `width`/`height` instead of `fill`) — `product-page`.
- A Shopify-loader fallback for the image optimizer (`docs/image-performance.md`'s option B) — only needed if the Vercel Hobby quota becomes a real problem; not now.

## Notes

- Source of truth for the image work: `docs/image-performance.md` (Recommendation, Verified facts, Implementation outline). `project-overview.md` §2 and `coding-standards.md` were already corrected by that research (WebP-via-`Accept` fact, `fetchPriority`/`loading` replacing deprecated `priority`).
- "Featured" = one product per collection. The catalog has no tag/featured flag and `query:` filtering is ignored by mock.shop. Sorting by `CREATED_AT` was rejected: all 30 products were created within ~2 s on 2026-08-20, so "newest" is just import order, and the newest four are all from `expedition-field-gear` (no apparel). Verified 2026-09-22: the per-collection query returns one product from each of the four collections, two of them on sale.
- `ProductImage` becomes a shared atom now rather than something built later per-page, since `collection-page` and `product-page` will need the same wrapper.
- Hero/collection/product links pointing at not-yet-existing routes is now an established, repeated pattern in this project (same as `layout-header`) — not something to second-guess each time.
