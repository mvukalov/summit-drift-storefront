# Image Performance Research

## Output

`docs/image-performance.md`

## Research

Product images from the API are ~1.4 MB PNGs (768×1344). How do we serve them fast with `next/image`, and how do we measure the improvement credibly?

## Include

- `next/image` config for `cdn.shopify.com` (`remotePatterns`, formats AVIF/WebP, `sizes` per layout)
- Using `priority` for the LCP image; reserving aspect ratio to prevent CLS
- Whether Shopify CDN `width` params help or whether Next's optimizer should do all resizing
- Measurement method: Lighthouse (mobile preset) on Home, Collection, Product — LCP, total image bytes, CLS — before and after, same conditions
- Lighthouse CI setup: budgets, which URLs, running against a preview deployment vs. local build
- Vercel image optimization limits for a hobby project, if relevant

## Sources

- Context7: Next.js 16 Image, Lighthouse CI
- Live API image URLs from `apparel-outdoor.mock.shop`
