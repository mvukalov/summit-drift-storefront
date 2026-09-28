# E2E & Accessibility Spec

## Overview

Introduce Playwright as the project's E2E layer and wire `@axe-core/playwright` into it, running against the real mock.shop API (not MSW) in a real browser. This feature does not add new product behavior; it collects the E2E and axe cases every prior feature deferred — recorded in `context/new-feature-list.md` for facets, product-page, cart and search — writes them as real test files, and adds a CI job so they run on every pull request going forward.

## Requirements

- Install `@playwright/test` and `@axe-core/playwright` as dev dependencies — **ask before installing**, per the standing project rule.
- `playwright.config.ts`: `webServer` config that runs `npm run build && npm run start` against an ephemeral port (production build, not `next dev`, so timings and behavior match what ships); base URL from that server; retries and trace-on-failure configured for CI; a11y-relevant viewports (at minimum 375px and 1280px, matching the manual checks already done per feature).
- `npm run test:e2e` (headless, CI) and `npm run test:e2e:ui` (local, Playwright's UI mode) scripts in `package.json`.
- New CI job in `.github/workflows/ci.yml`: builds once, runs the Playwright suite, uploads the HTML report and any trace/video artifacts on failure. Runs against the live mock.shop API — confirm the runner's network egress reaches `apparel-outdoor.mock.shop` (same public API every other feature already calls; no new access needed, but worth a first-run confirmation).
- Test files organized by user flow, one file per flow, not per component:
  ```
  e2e/
    home.spec.ts
    collection-and-facets.spec.ts
    product-page.spec.ts
    cart.spec.ts
    search.spec.ts
    a11y.spec.ts
  ```
- `a11y.spec.ts` runs `@axe-core/playwright` against every route the project has, in both an empty/default state and a populated/interactive state (drawer open, combobox open, facets applied), asserting **zero serious/critical violations** — the same bar already held manually (`axe 0 violations` recorded for product-page, cart and search).
- Read `context/new-feature-list.md` before writing tests and cross off every E2E/axe item it lists for facets, product-page, cart and search as each is implemented, so the file stops carrying them once this feature ships.

## Expected Behavior

No user-facing behavior changes. Every scenario below already exists in the app; this feature only proves it in a real browser against the real API, on every PR from now on.

- **Home → collection → facets:** navigate from home, apply a facet and a sort, confirm the URL reflects both and the grid updates; reload and confirm the same state renders from the URL alone.
- **Product page:** switch a variant (color/size), confirm price, gallery image and URL update together; a direct link with a variant pre-selected lands correctly.
- **Cart:** add → update quantity → remove, in one session; reload and confirm the cart survives (httpOnly cookie); add the same variant twice and assert one merged line, not two (API fact from `docs/cart.md`); header count is correct in the **raw server-rendered HTML**, asserted before hydration would have a chance to paper over a mismatch — this is the one assertion from `docs/cart.md`'s testing strategy that only a real E2E run can make.
- **Search:** type into the combobox → arrow to a suggestion → `Enter` → lands on that product; type a no-match term → results page shows its no-results state; type → `Enter` directly → results page shows count and sort control; change `sort`/`page` on the results page and confirm the URL and grid update together.
- **Accessibility:** every route above, plus the cart drawer and the search combobox opened, pass axe with zero serious/critical violations.

## Technical

- **Real API, not MSW.** This is consistent with every prior spec's testing section ("E2E, real API, per project convention") — MSW is for component tests, Playwright exercises the actual network path end to end. Because the catalog is static (30 products, verified across every feature's research) and cart/search are read/write against the same live instance every other feature already uses, no new environment is introduced.
- **Production build, not dev server.** `next dev` has different timing and error-overlay behavior than what ships; `webServer` in the Playwright config should run the built app.
- **Cart cookie behavior:** Playwright keeps cookies within a browser context by default, so a cart created in one test step is visible in the next within the same test — no special handling needed beyond not sharing a context across unrelated tests (each test file should get its own isolated context, which is Playwright's default).
- **Cross off deferred items, don't reinvent them.** `context/new-feature-list.md` already enumerates most of these cases in the language each feature's spec used; write tests from that list rather than re-deriving scenarios from scratch, and update the list as each is covered so it reflects only what's still outstanding after this feature ships.
- Follow existing patterns: TypeScript, no `any`, one flow per file, page-object-lite helpers only where real duplication appears (3+ times), not preemptively.

## UI

Not applicable — no new UI. Axe assertions cover the accessibility bar already established per feature (visible focus, touch targets ≥44px, live regions, keyboard operability) rather than introducing new requirements.

## Testing

- This feature _is_ the testing layer, so there is no separate "what must be covered" beyond the flows and axe checks already listed in Requirements/Expected Behavior.
- CI must fail the build if the Playwright suite fails or if any axe assertion finds a serious/critical violation.
- Flakiness watch: the live API's data (cart state, mutations) is shared across whatever runs against it, so tests should create their own cart/state within each test rather than depend on catalog data staying in a particular shape between runs (the catalog itself is stable — 30 products, verified repeatedly — only cart mutations are per-run state).

## Out of Scope

- Lighthouse CI, performance budgets, Cache Components — `performance` feature.
- Visual regression testing — not part of this project's stated testing strategy.
- New product features or UI changes of any kind.
- Storybook's own a11y addon coverage — already in place per component; this feature adds the page-level, real-browser axe pass on top, not a replacement.

## Notes

- Source: `context/new-feature-list.md` (deferred E2E/axe cases from `product-page`, `cart`, `search`), and each feature's own spec Testing section, which already wrote out most of these scenarios in detail.
- No `/research` was run for this feature — Playwright and `@axe-core/playwright` are well-established, current-version tools with no architectural decision to make (unlike cart/search); if something version-specific about Next.js 16 / React 19 compatibility surfaces during setup, treat it as a "Verify first" item rather than stopping for a research pass.
- This closes the loop the last several features left open: PR history should show the axe/E2E lines in each feature's Testing section finally backed by real files, not just manual browser checks.

## Verify first

1. Confirm `@playwright/test`'s bundled browsers install and run cleanly in the GitHub Actions runner (standard for this tool, but confirm rather than assume, per the project's "don't assume the API" habit extended to tooling).
2. Confirm the CI runner's network egress reaches `apparel-outdoor.mock.shop` before writing every test around that assumption.
