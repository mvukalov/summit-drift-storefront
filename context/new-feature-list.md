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
- **Content-Security-Policy header** — defence in depth behind the `descriptionHtml` sanitizer: a `script-src` without `unsafe-inline` makes even a sanitizer bypass inert. Next 16 `next.config.ts` headers make it small; the `JsonLd` `application/ld+json` blocks are not executable and are unaffected (see `docs/html-sanitization.md`)
- **Lightweight SEO query** — `generateMetadata` on the collection page calls `getCollection`, fetching 250 products to read a title and description (measured: 2 network hits per render, Apollo does not dedupe across differing sort variables). A `CollectionSeo` document (handle → title, description) would serve metadata on collection and product pages alike

## Carried over for `e2e-and-a11y`

Cart E2E cases specified in `context/features/012-cart-spec.md` but not written there: Playwright
is not a dependency yet, so the cart feature verified each of these manually in Chromium
instead. They are listed here so the E2E feature picks them up rather than re-deriving them.

- **Header count in the raw server HTML** — assert against the **initial document response**,
  not the hydrated DOM. This is the one that proves the httpOnly-cookie design: the count is
  server-rendered from the cookie, so there is no hydration mismatch and no 0 → N flicker.
  Verified manually with `curl -H 'Cookie: cart_id=…'` (no JavaScript) returning `Cart, 5 items`;
  only E2E can keep it honest. The cookie is httpOnly, so the test has to add it through the
  browser context rather than `document.cookie`.
- **Add → update → remove** against the real API, then **reload and assert the cart survives**.
- **Add the same variant twice → one merged line**, not two (the API's `cartLinesAdd` merges).
- **Focus moves into the drawer** when a PDP add opens it. Deliberately not asserted in the
  component test: `showModal()` moves focus natively, jsdom does not implement it, and faking it
  in the stub would only test the stub.
- **Escape closes the drawer and focus returns** to the header cart button — also native
  `<dialog>` behaviour that jsdom cannot exercise.
- **axe on the open drawer** (populated and empty). Run manually via injected axe-core at 375
  and 1280: 0 violations.
- **Per-line ceiling refusal** — with a line at 10, an add is refused, **no request is made**,
  and the quantity does not change (decision 4 in `docs/cart.md`).
