# Layout & Header Spec

## Overview

Build the site chrome every page will share: `Header` (logo, primary nav from the real `main-menu` API data, cart trigger, mobile menu), `Footer`, and a skip link — mounted once in `src/app/layout.tsx` around `{children}`. This is organism-level composition on top of the atoms already built; no new atoms.

## Requirements

- `Header` organism: logo/wordmark, primary nav built from `menu(handle: "main-menu")` (not hard-coded collection names — the four links come from the API, same principle as `getCollections`), a cart trigger button, and a mobile hamburger that opens a slide-in nav panel.
- `Footer` organism: brand blurb + a "Collections" link column reusing the same real menu/collection data as the header nav.
- A skip link: first focusable element on the page, visually hidden until focused, jumps to `<main id="main-content">`.
- `src/app/layout.tsx` renders `Header`, `<main id="main-content">{children}</main>`, `Footer`.
- New GraphQL document + fetcher for the menu (`getMainMenu()`), following the same pattern as `getCollections()` — typed, mapped to a small domain type, no hand-written response types.
- Mobile nav panel: keyboard-operable, closes on `Escape`, returns focus to the hamburger button on close, traps focus while open.

## Expected Behavior

- Desktop: logo left, nav links center/right (Protection Shells, Foundation Layers, Traverse Bottoms, Field Gear — from the API, not "Home"; the logo already serves as the home link so the menu's own "Home" entry is filtered out), cart button right.
- Mobile: logo, cart button, hamburger. Tapping the hamburger opens a panel (`context/screenshots/home-mobile-menu-open.png`) with the four nav links; `Escape` or the close button dismisses it.
- Nav links point to `/collections/[handle]` and will 404 until `collection-page` ships (two features from now) — same situation the temporary Home page has had since `graphql-layer`. This is expected during incremental build-out, not a defect to fix here.
- Cart button is present but inert (no item count, no drawer) — there's no cart state until the `cart` feature. Shows an icon only; wiring it up is explicitly out of scope here.
- Footer's "Collections" column links the same way and carries the same temporary-404 caveat.
- Tab from the page's very first element focuses the skip link; activating it moves focus to `<main>`.

## Technical

- `src/components/organisms/Header/Header.tsx` (+ `.module.scss`, `.test.tsx`, `.stories.tsx`), `src/components/organisms/Footer/` likewise. The mobile nav panel is internal to `Header/` (not a separate atomic-layer component) unless it turns out something else needs to reuse it — don't force an abstraction for one consumer.
- `Header` needs client interactivity (menu open/close state) — mark that part `"use client"`, keep the RootLayout itself a Server Component per `coding-standards.md`.
- New file: `src/lib/graphql/documents/menu.graphql` (a `MainMenu` query using `menu(handle: "main-menu")`). Extend `src/lib/catalog/mappers.ts`/`fetchers.ts` with a `toMenuItem` mapper and `getMainMenu()` fetcher — same module as the rest of catalog/navigation data, no new `lib/` subfolder for one query.
- Domain type: a small `MenuItem { title: string; href: string }` in `src/types/catalog.ts` (or a new `src/types/navigation.ts` if it reads awkwardly bolted onto catalog — Claude Code's call).
- Consider the native `<dialog>` element for the mobile panel — built-in focus trap, `Escape`-to-close and backdrop, less hand-rolled a11y logic. Confirm current React 19 / Next 16 compatibility and patterns via Context7 before committing to it; fall back to a manual implementation (focus trap + `Escape` handler) if it doesn't fit.
- Cart trigger: a `Button` (or plain icon button using existing atoms/tokens) with no click handler yet beyond maybe a no-op — don't build toward a `CartDrawer` that doesn't exist.

## UI

- Reference `context/screenshots/home-desktop-1.png` (header), `home-mobile-1.png` (mobile header), `home-mobile-menu-open.png` (mobile panel), and `styleguide-desktop-2.png` (footer, bottom section) — direction only, not pixel-exact, same caveat as prior features.
- Footer in the mockup has a second column ("Field Service": Shipping & returns, Care guide, Contact) linking to pages that aren't part of this project's MVP feature list at all (not planned later either — `project-overview.md` §3 scopes the app to Home/Collection/Product/Search/Cart/design-system). Unlike the collection links, these would be permanently dead. **Default: omit that column** rather than link to nothing — flag this in the PR description since it's a visible deviation from the mockup, and Martin can restore it as static text or drop it entirely on review.
- Touch targets ≥44×44px for the hamburger, cart button and nav links (`coding-standards.md`).
- Focus-visible ring uses the existing `--color-focus-ring` token, consistent with atoms.
- Reduced motion: the mobile panel's open/close transition respects `prefers-reduced-motion` (already a global rule; confirm the panel's own transition doesn't bypass it).

## Testing

- **Unit:** `toMenuItem` mapper, `getMainMenu()` fetcher (MSW, Node env) — success, and confirm the "Home" entry is filtered from the nav. Same pattern as `graphql-layer`'s catalog tests.
- **Component (RTL):** `Header` renders nav links from mocked menu data; mobile hamburger opens/closes the panel; `Escape` closes it and returns focus to the trigger. Note: jsdom's support for native `<dialog>` focus-trap behavior is limited — if `<dialog>` is used, verify what jsdom actually exercises versus what needs a manual assertion or is left to E2E later (`e2e-and-a11y`); don't claim coverage the test doesn't actually provide.
- **Footer:** renders brand blurb and collection links from the same data source.
- **Storybook + a11y addon:** stories for `Header` (closed/open mobile menu) and `Footer`, each checked by the addon.
- No E2E here — full keyboard-flow verification across real pages is `e2e-and-a11y`.

## Out of Scope

- Search input/combobox in the header — that belongs to the `search` feature per `project-overview.md` §3 ("Header combobox with predictive suggestions"); adding an inert search box now would be fake UI. `search` adds it into the header layout when it exists.
- Cart drawer, live item count, click behavior on the cart button — `cart` feature.
- `/collections/[handle]` actually resolving — `collection-page` feature.
- Footer's "Field Service" links (see UI section) — not part of the MVP scope at all.
- Any page-specific header variant (e.g., transparent-over-hero) — not needed until a page asks for it.

## Verify first (unverified in the research)

1. The exact shape of `menu(handle: "main-menu")` / `MenuItem` on mock.shop's schema — specifically whether a `MenuItem` exposes anything that maps cleanly to a local collection `handle`, or whether the handle has to be parsed out of an absolute `url` string. Check a real response before writing the mapper; don't assume the shape from generic Shopify docs.
2. Native `<dialog>` for the mobile panel in this React 19/Next 16 setup — confirm current best practice via Context7 rather than hand-rolling focus-trap logic if `<dialog>` covers it.

## Notes

- Nav links (header and footer) intentionally point to routes that don't exist yet (`/collections/[handle]`); this mirrors the same incremental approach already used for the temporary Home page since `graphql-layer`.
- The footer's second link column is dropped by default for having no real destination in this project's scope — a deliberate deviation from the mockup, call it out in the PR.
- Cart button is a visual placeholder only; `cart` feature is next up per the README order after `home-page`/`collection-page`/`facets`/`product-page`, so this stays inert for a while.
