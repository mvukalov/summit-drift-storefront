# New Feature List

Ideas that are **out of scope for the MVP**. Add here instead of building them. Each line: idea — why it's interesting.

## Commerce

- **Wishlist** — saved products in local storage, shareable via URL
- **Recently viewed** — client-side list on product pages
- **Product quick view** — modal from the collection grid
- **Size guide** — per-collection guide in a dialog

## Platform

- **Multi-store theming** — the same component library on a second mock.shop store with different tokens
- **i18n** — Croatian/English UI strings (the API has one market, so UI text only)
- **Customer accounts** — not available on mock.shop; would need a real Shopify store

## Engineering

- **Visual regression tests** — Storybook + Chromatic or Playwright screenshots
- **Bundle analysis in CI** — fail on size regressions
- **Real User Monitoring** — Web Vitals reported from production
- **Lightweight SEO query** — `generateMetadata` on the collection page calls `getCollection`, fetching 250 products to read a title and description (measured: 2 network hits per render, Apollo does not dedupe across differing sort variables). A `CollectionSeo` document (handle → title, description) would serve metadata on collection and product pages alike
