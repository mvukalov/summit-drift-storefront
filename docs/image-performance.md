# Image Performance

> Research for `context/research/image-performance.md`. Done on 2026-09-22 against Next.js 16.3.5 (installed), sharp 0.35.4 (installed, used by Next's optimizer) and `@lhci/cli` 0.15.1 (npm).
> **Verified** means I saw it in docs, in the installed source, or in a live response. **Assumption** means I haven't tested it yet, so check it during implementation.

## Recommendation

Let **Next's built-in optimizer do all resizing and encoding**, and don't use Shopify's `width` parameter.

- Allow `cdn.shopify.com` with two tight `remotePatterns`, one per path family the catalog uses.
- Set `formats: ['image/avif', 'image/webp']`.
- Trim `deviceSizes` and `imageSizes` to widths that are useful for a 768 px source.
- Keep `qualities: [75]`.
- Every image gets an explicit `sizes` that matches its layout.
- Reserve space with the known 768×1344 ratio (4:7). Collection images report `width/height: null`, so use a fallback constant.
- Mark the single LCP image per page with `fetchPriority="high"` (plus `loading="eager"`). **`priority` is deprecated in Next 16**, and the docs prefer `fetchPriority`/`loading` over the new `preload` prop in most cases.

**The biggest finding changes the performance story.** The overview says images are ~1.4 MB PNGs. That is true only for clients that don't advertise WebP (curl, and Next's own server-side fetch). Shopify's CDN negotiates on `Accept`, so **a real browser already gets a ~56–89 KB WebP of the full 768×1344 image**. The honest "before" is therefore a full-size CDN WebP, not a 1.4 MB PNG. Next's AVIF at the rendered width is still **~4–13× smaller** than that.

Measure with a same-code A/B toggle: an env flag that sets `images.unoptimized`. Run Lighthouse mobile on the same machine, 5 runs, median, with a warm image cache. Gate PRs with Lighthouse CI against a local `next start`, not a Vercel preview.

## Decisions

Made by the project architect on 2026-09-22. These replace the matching options under "Alternatives and trade-offs" and any snippet in "Implementation outline" that says otherwise.

1. **Resizing: option A.** Next's built-in optimizer with `formats: ['image/avif', 'image/webp']`. No Shopify `width` parameter and no custom loader.
2. **Image component: an atom** at `src/components/atoms/ProductImage/`, not local to the Home page. The collection page and PDP will reuse it.
3. **Crop: native 4:7 everywhere for now**, for product cards and collection tiles alike, through a `--ratio-product-image` token. Collection tiles get no separate ratio until a real layout shows they need one.
4. **LCP hints:**
   - `fetchPriority="high"` (with `loading="eager"`) on exactly one image per page.
   - The first ~4 grid cards use `loading="eager"` without high priority.
   - `priority` and `preload` are not used.
5. **Dimensions: `fill` everywhere on Home.** Collection images have `null` dimensions anyway, so the mapper needs no 768×1344 fallback. Fixed `width={768} height={1344}` is left for the PDP gallery later.
6. **Lighthouse runs against a local `next start`**, not a Vercel preview.
7. **No `@lhci/cli` in this feature.** Only `/` exists today. Lighthouse CI (config, budgets, CI job, `lhci` script) belongs in the performance feature, once Home, Collection and Product routes all exist. For now, the evidence in the PR is a manual before/after measurement: the `IMAGES_UNOPTIMIZED` env flag plus a Lighthouse mobile run (Implementation outline §5). §6 below is the reference for that later feature.
8. **Context docs corrected:** `context/project-overview.md` §2 now describes the `Accept`-based WebP behaviour, and `context/coding-standards.md` uses `fetchPriority`/`loading` instead of `priority`.

## Verified facts

### Live images (`cdn.shopify.com`, 2026-09-22)

- **79 product images**, all unique and all **768×1344** (exactly 4:7). 19 products have 3 images and 11 have 2.
- **Variant images:** each product's variants all point to one image, the featured image. The "switch image on variant change" path never fires with this catalog.
- **Collection images:** the 4 collection images are product featured images (same URLs), but the API returns `width: null, height: null` for them.
- **Two URL families:**
  - 30 URLs look like `https://cdn.shopify.com/s/files/1/0926/<shop>/<id>/files/<hash>.png?v=<n>`. They always carry a `?v=` query, and two different shop ids appear.
  - 49 URLs look like `https://cdn.shopify.com/mock-shop-production-media/apparel-outdoor/<uuid>.png`, with no query.
- **Format is negotiated by `Accept`**. The response has `vary: Accept` and `cache-control: public, max-age=31557600` (1 year).

| Request (same source image)          | `Accept: */*` or `image/png` | `Accept: image/webp` (any browser) | `Accept: image/avif` only |
| ------------------------------------ | ---------------------------- | ---------------------------------- | ------------------------- |
| full size                            | PNG **1,451,551 B**          | WebP **89,154 B**                  | PNG 1,451,551 B           |
| `&width=384`                         | PNG 361,397 B                | WebP 25,480 B                      | PNG 361,397 B             |
| `&width=828` / `&width=1080`         | PNG 1,451,551 B (no upscale) | WebP 89,154 B (no upscale)         | PNG                       |
| second family, full size (`b` image) | PNG 1,372,317 B              | WebP 55,966 B                      | —                         |

- Shopify **never serves AVIF**, and it ignores `&format=webp`. `url(transform: { maxWidth, preferredContentType: WEBP })` only appends `&width=` (or `?width=`), so `preferredContentType` has no effect on the URL. The WebP the overview thought was "ignored" is really decided by the request header.
- **First-hit latency varies a lot.** One cold `?width=640` request took **12.7 s**. Most requests took 0.4–1.8 s. `server-timing` shows about 450 ms of processing on a miss.

### Next.js 16 image optimizer (installed docs and source)

Sources: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` and `node_modules/next/dist/server/image-optimizer.js`.

**Props**

- `priority` is **deprecated since v16.0.0**, replaced by `preload`.
- The docs say not to use `preload` when several images could be the LCP depending on viewport, or together with `loading`/`fetchPriority`. Quote: _"In most cases, you should use `loading="eager"` or `fetchPriority="high"` instead of `preload`."_
- `width`/`height` only set the aspect ratio. Both are required unless the image uses `fill` or is a static import.
- Without `sizes`, the browser assumes `100vw` and Next only generates a 1x/2x `srcset`.

**Config**

- `qualities` is **required-by-default `[75]`** since v16. A `quality` prop that isn't in the list is coerced to the nearest allowed value.
- `formats` defaults to `['image/webp']`. Output is chosen from the request `Accept`, and each format is cached separately.
- `remotePatterns`: leaving out `search` implies a `**` wildcard. `search: ''` forbids any query string, which **would reject the `?v=` URLs**.
- Defaults: `deviceSizes` `[640, 750, 828, 1080, 1200, 1920, 2048, 3840]`, `imageSizes` `[32, 48, 64, 96, 128, 256, 384]`.
- `minimumCacheTTL` defaults to 14,400 s. The effective TTL is the larger of that and the upstream `Cache-Control` max-age, so Shopify's 1 year applies.
- Upstream fetch timeout is **7 s** (`AbortSignal.timeout(7000)`). A timeout returns **504**.
- `maximumResponseBody` defaults to 50 MB.

**Encoder** (`optimizeImage`)

- It resizes with `withoutEnlargement: true`, so widths above 768 output a 768 px image.
- AVIF uses `quality × 50/80` and `effort: 3`. WebP uses `quality`.
- The upstream `fetch` sends no `Accept`, so Next receives the **1.4 MB PNG** server-side. That is fine because it happens once per cache key.

### Next's output size, reproduced locally

I ran the project's own sharp with Next's exact settings at q75 on two real catalog PNGs. Both the widths and Next's settings come from the installed source, so these numbers should match `/_next/image` output. I haven't compared them against a running server yet, so treat that match as an assumption until the implementation confirms it.

| width                   | AVIF (image a / b) | WebP (a / b)   | Shopify WebP at same width (a) |
| ----------------------- | ------------------ | -------------- | ------------------------------ |
| 256                     | 4.0 / 3.6 KB       | 5.5 / 5.0 KB   | —                              |
| 384                     | 6.8 / 5.9 KB       | 9.8 / 8.8 KB   | 24.9 KB                        |
| 640                     | 16.9 / 12.7 KB     | 23.2 / 18.1 KB | 73.8 KB                        |
| 750                     | 24.6 / 17.7 KB     | 33.1 / 23.3 KB | —                              |
| 828+ (capped at 768 px) | 25.4 / 17.9 KB     | 35.1 / 24.3 KB | 87.1 KB (full)                 |
| encode time             | 50–170 ms          | 35–105 ms      |                                |

### Vercel Hobby (vercel.com docs, updated 2026-08)

- **Included per month:** 5K image transformations, 300K cache reads, 100K cache writes.
- **Over the limit:** new images return **402**, so `onError` fires and the alt text shows. Already-cached images keep working, and nothing is billed.
- **What is billed:** each MISS or STALE counts as one transformation. The remote cache key is project + `w` + `q` + `url` + normalized `Accept`. **Redeploying does not invalidate it.** TTL is the larger of upstream max-age and `minimumCacheTTL`.
- **Size limits:** source images can be up to 8192 px per side, and transformed output can be up to 10 MB.
- Vercel's cost guide suggests fewer `formats`, a `qualities` allowlist and trimmed `deviceSizes`/`imageSizes`.

**Budget for this catalog (calculation):** 79 images × 6 widths (the recommended config) × 2 formats = **948 transformations** at most, and each cached entry lives for about 1 year. That is under 5K even with a full crawl. With the default 15 widths it would be 2,370, most of them duplicate 768 px encodes.

### Lighthouse CI (Context7 `/googlechrome/lighthouse-ci`, npm)

- **Versions:** `@lhci/cli` 0.15.1 bundles **Lighthouse 12.6.1**. Standalone `lighthouse` is at 13.5.0, but LHCI doesn't use it.
- **Collect options:** `startServerCommand`, `startServerReadyPattern` (default `listen|ready`), `url[]`, `numberOfRuns`, and `settings` (for example `throttlingMethod`).
- **Assertions:**
  - `categories:<id>` with `minScore`.
  - Audit ids with `maxNumericValue`.
  - `resource-summary:<type>:size` in **bytes**.
  - `assertMatrix` for per-URL rules.
  - `aggregationMethod`: `median` / `optimistic` / `pessimistic` / `median-run`.
- **Upload:** `target: 'temporary-public-storage'` makes the report publicly viewable.
- **GitHub Actions:** the official example runs `npm run build` followed by `lhci autorun`. A status check needs `LHCI_GITHUB_APP_TOKEN`.

## Alternatives and trade-offs

### 1. Where resizing happens

| Option                                                                                 | Bytes per image (mobile card, ~384 w)        | AVIF | Vercel usage                     | Complexity                                                       |
| -------------------------------------------------------------------------------------- | -------------------------------------------- | ---- | -------------------------------- | ---------------------------------------------------------------- |
| **A. Next optimizer, raw URL as `src` (recommended)**                                  | ~6–7 KB AVIF                                 | ✅   | ≤ ~950 transformations, one time | Config only                                                      |
| B. Custom `loaderFile` that writes Shopify `&width=` URLs (Shopify does the transform) | ~25 KB WebP                                  | ❌   | 0                                | Loader handles two URL shapes (`?` vs `&`); it's a client module |
| C. Shopify `width` URL fed into Next's optimizer                                       | same as A                                    | ✅   | same                             | Pointless: Next resizes anyway and the cache key grows           |
| D. `unoptimized` / plain CDN URL                                                       | ~56–89 KB WebP (full size on every viewport) | ❌   | 0                                | Nothing to do, but it's the baseline, not a solution             |

- **A is recommended** because it gives 3–4× fewer bytes than B, uniform AVIF, one code path, and it is the thing the project is meant to demonstrate. Its costs are cold-miss latency (the upstream fetch plus a 50–170 ms encode) and dependence on Vercel quotas.
- **B is the fallback** if the Hobby quota ever becomes a problem. It is still much better than D, because Shopify resizes and serves WebP.

### 2. `formats`

- **`['image/avif', 'image/webp']` is recommended.** AVIF is ~25–30% smaller than WebP here. It doubles cache entries, which is fine within the budget.
- **`['image/webp']` alone** halves transformations and encodes faster on a cold miss. Vercel recommends it for cost.

### 3. LCP hint

- **`fetchPriority="high"` + `loading="eager"` on exactly one image per page is recommended.** This follows the Next 16 docs.
- **`preload`** inserts a `<link>` in `<head>`. It helps when the image is discovered late. Here the image is in the SSR HTML, so the benefit is smaller, and the docs warn against it when the LCP candidate depends on the viewport, which is our grid's case.

### 4. Reserving the aspect ratio

- **`width`/`height` from the data (768×1344)** gives the browser the intrinsic ratio. Use it on the PDP gallery.
- **`fill` + a CSS `aspect-ratio` box** allows a uniform crop (`object-fit: cover`) in grids and cards regardless of source dimensions. It also works for collection images whose size is `null`. This is recommended for cards.

### 5. Where Lighthouse CI runs

| Target                                                     | Pros                                                           | Cons                                                                                                                                                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local `next start` in CI (recommended)**                 | No secrets, runs in the existing workflow, deterministic build | No CDN/HTTP2 edge. A GitHub runner is noisy. `next start` has its own on-disk image cache, so it behaves differently from Vercel's                                                                       |
| Vercel preview deployment                                  | Real production path (Vercel image CDN, edge)                  | Waits for the deploy. Preview protection needs a bypass token (**assumption**: "Protection Bypass for Automation" is available on Hobby). Preview toolbar and `noindex` may skew scores (**assumption**) |
| Production, measured manually (PageSpeed / Lighthouse CLI) | Best for README numbers                                        | Not a PR gate                                                                                                                                                                                            |

## Implementation outline

It fits into the feature where images first render: product cards on the collection page, or the Home "featured" grid.

### 1. `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Baseline for before/after measurement only: IMAGES_UNOPTIMIZED=1 npm run build
    unoptimized: process.env.IMAGES_UNOPTIMIZED === "1",
    remotePatterns: [
      // `search` omitted → any query allowed; these URLs carry `?v=<n>`.
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/1/0926/**" },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/mock-shop-production-media/apparel-outdoor/**",
        search: "",
      },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Sources are 768 px wide; widths above ~828 all encode to 768 and only add cache keys.
    deviceSizes: [640, 750, 828],
    imageSizes: [256, 384],
  },
};

export default nextConfig;
```

- `pathname: "/s/files/1/0926/**"` covers both shop ids seen. `**` is allowed only at the end.
- Validate the env flag with Zod if the project's env schema already covers build-time vars. A plain string compare is fine in config (**decision**).

### 2. One image wrapper component (decision: atom vs. molecule-local)

- **Suggested:** `src/components/atoms/ProductImage/ProductImage.tsx`, a thin wrapper around `next/image`.
- **Required props:** `sizes` and `alt` (fall back to the product title when `altText` is null).
- **Priority prop:** takes `priority?: boolean` and maps it to `fetchPriority="high"` + `loading="eager"`.
- **Rendering:** always `fill` inside a `.frame` with `aspect-ratio`. The ratio comes from a token or prop: `4 / 7` native, or a chosen crop such as `3 / 4`.
- **Why a wrapper:** the "always `sizes`" rule and the LCP rule live in one place and can be tested.

```tsx
import Image from "next/image";
import styles from "./ProductImage.module.scss";

interface ProductImageProps {
  src: string;
  alt: string;
  sizes: string;
  isLcp?: boolean;
}

export function ProductImage({ src, alt, sizes, isLcp = false }: ProductImageProps) {
  return (
    <div className={styles.frame}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={styles.image}
        {...(isLcp ? { fetchPriority: "high", loading: "eager" } : {})}
      />
    </div>
  );
}
```

```scss
.frame {
  position: relative;
  aspect-ratio: var(--ratio-product-image); // new token, e.g. 4 / 7
  overflow: hidden;
  background: var(--color-surface-muted); // placeholder colour while loading
}
.image {
  object-fit: cover;
}
```

The PDP gallery can use intrinsic `width={768} height={1344}` instead of `fill`. For Home collection tiles, use `fill` as well, since the API reports no dimensions.

### 3. `sizes` per layout

These strings depend on grid columns that don't exist yet, so they are **assumptions**. Update them with the grid spec. A 1280 px max content width is also assumed.

| Place                                                 | Layout (mobile → md → lg)          | `sizes`                                                       |
| ----------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Product grid card (collection, search, Home featured) | 2 cols → 3 cols → 4 cols, max 1280 | `"(min-width: 1280px) 304px, (min-width: 768px) 33vw, 50vw"`  |
| PDP main gallery image                                | full → ~50% → ~600 px              | `"(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"` |
| PDP thumbnails                                        | fixed ~80 px                       | `"80px"`                                                      |
| Home collection tile                                  | 2 cols → 4 cols                    | `"(min-width: 768px) 25vw, 50vw"`                             |
| Cart drawer line                                      | fixed ~64 px                       | `"64px"`                                                      |

- At 375 px and DPR 3, a grid card needs 188 × 3 ≈ 563 px, so it picks **640** (~17 KB AVIF).
- A PDP main image at 375 px and DPR 3 picks **828**, which is served at 768 px (~25 KB).

### 4. LCP image per page

- **Home:** the hero image, or the first collection tile if there is no hero image.
- **Collection:** the first product card. Only one image gets high priority. The first ~4 cards can also use `loading="eager"` without high priority (**decision**).
- **PDP:** the first gallery image.

### 5. Measurement (before/after)

1. **Baseline:** `IMAGES_UNOPTIMIZED=1 npm run build && npm start`. Same code and layout, and the browser gets Shopify's full-size WebP.
2. **Optimized:** `npm run build && npm start`. Warm the image cache by loading each page once before measuring.
3. **Run:** for each of Home, `/collections/summit-protection-shells` and `/products/<handle>`, run Lighthouse **mobile** (the default preset: simulated throttling, Moto G-class device, 412 px) **5×** on the same machine, with no extensions, and take the median. Use LHCI's `collect` with `numberOfRuns: 5` so both runs share the same Lighthouse version (12.6.1).
4. **Record** LCP, CLS, `total-byte-weight` and `resource-summary` image bytes and count. Put them in a README table with the date, commit SHA, Lighthouse version and command.
5. **Optional extra row:** "Next optimizer, cold cache". It shows the first-hit encode cost honestly.
6. **Do not** present "1.4 MB → 7 KB" as the win. That compares curl against a browser. The honest comparison is "full-size CDN WebP (~56–89 KB) → right-sized AVIF (~6–25 KB)" per image.

### 6. Lighthouse CI

- Add the dev dependency `@lhci/cli` (**dependency approval needed**) and the script `"lhci": "lhci autorun"`.
- Add a separate `lighthouse` job to `.github/workflows/ci.yml` (or a `needs: ci` job) that builds and runs `npm run lhci`.

```js
// lighthouserc.cjs
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready",
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/collections/summit-protection-shells",
        "http://localhost:3000/products/waterproof-wading-jacket-with-breathable-shell",
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9, aggregationMethod: "median-run" }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: 2500, aggregationMethod: "median" },
        ],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1, aggregationMethod: "median" }],
        // Guards against a regression to unoptimized images (bytes). Tune after the first real run.
        "resource-summary:image:size": ["error", { maxNumericValue: 300000 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
```

- **Only add URLs for routes that exist.** Today only `/` exists, and the collection and PDP routes come in later features.
- **The image-bytes budget** is the assertion that actually protects this work. Set it from the measured optimized numbers plus about 25%.
- **The first run in CI is always cold.** Either add one warm-up run, or accept that the cold run can be dropped with `median`/`median-run` aggregation.

## Testing strategy

- **Unit (Vitest, `src/lib/`):**
  - The mapper's image fallback: `width/height` null → 768×1344 constant, or `null` if we use `fill` everywhere (**decision**).
  - `alt` fallback to the title.
- **Component (RTL):** `ProductImage` renders an `img` with the given `sizes` and `alt`.
  - With `isLcp`, it has `fetchpriority="high"` and no `loading="lazy"`.
  - Without it, it has `loading="lazy"`.
- **Config test (optional):** assert that each real fixture URL from `src/lib/graphql/__fixtures__` matches one `remotePatterns` entry. Next's matcher is `matchRemotePattern` in `next/dist/shared/lib/match-remote-pattern` (**assumption**: the import path is stable). This catches a new CDN path family before production does.
- **E2E (Playwright):**
  - Each main page loads with no `/_next/image` 4xx or 5xx responses.
  - The LCP image `currentSrc` contains `/_next/image`.
  - AVIF is served: `content-type: image/avif` on a sampled image response in Chromium.
- **Lighthouse CI:** the budgets above, including `resource-summary:image:size`.
- **Storybook:** `@storybook/nextjs-vite` mocks `next/image`. Check that remote URLs render in stories (**assumption**, not tested).

## Risks / open questions

1. **Upstream timeout.** Next aborts the upstream fetch after 7 s. One cold Shopify request took 12.7 s (a `width=` variant, which we won't use; raw URLs took 0.4–1.1 s). A cold miss can return 504 and show alt text. Mitigations are the 1-year cache and warming the cache after deploy.
2. **Vercel Hobby quota.** Up to ~950 transformations is safe, but the quota is shared across all Hobby projects on the account. Exceeding it gives **402 alt text for new images**. Fallback: option B (a Shopify loader) or WebP only.
3. **The overview's data quirk is inaccurate.** It says "`&width=` stays PNG" and "`preferredContentType: WEBP` is ignored". Both results come from curl without `Accept`. Browsers get WebP from Shopify. `context/project-overview.md` §2 should be updated. I haven't edited it because this task is documentation-only.
4. **`coding-standards.md` says "The LCP image uses `priority`".** In Next 16 that is deprecated, so the rule should read `fetchPriority="high"` (or `preload`).
5. **The variant image requirement can't be exercised with this catalog.** Every variant uses the featured image. Unit-test it with a synthetic fixture.
6. **Local vs. Vercel optimizer.** `next start` uses sharp with the settings above. Vercel's image service may encode differently (**assumption**). README numbers should say which environment they came from.
7. **LHCI bundles Lighthouse 12.6.1, not 13.x.** Use the same tool for before and after, and name the version in the README.
8. **CI runs against the live mock.shop.** A mock.shop outage fails the Lighthouse job. That is acceptable for a portfolio project, but it should be noted.

## Sources

- **Next.js 16.3.5 bundled docs:**
  - `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` (props, config, version history)
  - `.../05-config/01-next-config-js/images.md`
- **Next.js source:** `node_modules/next/dist/server/image-optimizer.js` (`optimizeImage` encoder settings, `fetchExternalImage` 7 s timeout and no `Accept`, `getSupportedMimeType`).
- **Context7:** `/googlechrome/lighthouse-ci` (configuration: collect, assert, assertMatrix, aggregation methods, resource-summary budgets, GitHub Actions).
- **npm (2026-09-22):** `@lhci/cli@0.15.1` (depends on `lighthouse@12.6.1`), `lighthouse@13.5.0`.
- **Vercel docs:**
  - https://vercel.com/docs/image-optimization/limits-and-pricing (updated 2026-08-11)
  - https://vercel.com/docs/image-optimization (cache keys and TTL, updated 2026-08-13)
  - https://vercel.com/docs/image-optimization/managing-image-optimization-costs
- **Live API and CDN observations (2026-09-22):**
  - GraphQL at `https://apparel-outdoor.mock.shop/api`: image dimensions, URL families, collection image nulls, variant images, `url(transform:)` output.
  - `curl` against `cdn.shopify.com` with different `Accept` headers and `width` values: sizes, content types, `vary`, `cache-control`, timings in the tables above.
  - Local sharp 0.35.4 encodes with Next's settings (script kept in the session scratchpad, not in the repo).
