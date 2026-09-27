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

Search E2E cases specified in `context/features/013-search-spec.md`, carried over for the same
reason. Each was verified manually in Chromium against the real API on 2026-09-27.

- **Type → suggestions → arrow → Enter → product page.** Typed "jacket", ArrowDown twice,
  Enter landed on `/products/oversized-technical-nylon-jacket` with the list closed.
- **Enter with nothing active → results page.** After Escape, Enter went to `/search?q=jacket`
  (7 results, sort control, title `Search results for “jacket”`).
- **No-match term → no-results state.** `/search?q=jaket` shows the spelling hint and no sort.
- **Sort and page update the URL and the grid.** `?q=a` (all 30 products): price-desc re-sorts
  from $485, `page=2` shows the remaining 14, Previous/Next keep the sort. Focus stays on the
  sort control through the re-render — the regression the collection page once had.
- **Direct link / reload.** `/search?q=a&sort=price-asc&page=2` renders that exact set;
  `sort=bogus&page=-4` falls back to relevance and page 1.
- **`noindex` in the served HTML.** `<meta name="robots" content="noindex, follow">` on results,
  no-match and no-query pages; no canonical.
- **axe on the open combobox and the results page.** Manually via injected axe-core at 375 and
  1280, in the results, no-results, no-query and no-match states: 0 violations. This run is
  what caught `aria-controls` pointing at an unrendered listbox (critical), now fixed and
  covered by a component test.
