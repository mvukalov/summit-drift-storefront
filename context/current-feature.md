# Current Feature: Layout & Header

## Status

In Progress

## Goals

- [x] `menu.graphql` (`MainMenu` query, `menu(handle: "main-menu")`) + codegen; `toMenuItem` mapper and `getMainMenu()` fetcher in `src/lib/catalog/` returning `MenuItem { title, href }` with the "Home" entry filtered out
- [x] `Header` organism: logo/wordmark (home link), primary nav from the API, inert cart icon button, mobile hamburger opening a slide-in nav panel
- [x] Mobile nav panel: keyboard-operable, closes on `Escape` and close button, returns focus to the hamburger, traps focus while open
- [x] `Footer` organism: brand blurb + "Collections" link column from the same menu data (no "Field Service" column)
- [x] Skip link: first focusable element, visually hidden until focused, targets `<main id="main-content">`
- [x] `src/app/layout.tsx` (Server Component) renders `Header`, `<main id="main-content">{children}</main>`, `Footer`
- [x] Touch targets ≥ 44×44px (hamburger, cart, nav links); `--color-focus-ring` focus-visible; panel transition respects `prefers-reduced-motion`
- [x] Unit tests: `toMenuItem`, `getMainMenu()` (MSW, Node env) incl. "Home" filtered out
- [x] Component tests: `Header` renders links, hamburger opens/closes panel, `Escape` closes and returns focus (be explicit about what jsdom `<dialog>` actually exercises); `Footer` renders blurb and links
- [x] Storybook stories: `Header` (closed / mobile menu open), `Footer`; a11y addon clean (axe-core, scoped to `#storybook-root` like the addon: 0 violations)

## Notes

- Spec: `context/features/006-layout-header-spec.md`
- Mockups (direction only): `context/screenshots/home-desktop-1.png`, `home-mobile-1.png`, `home-mobile-menu-open.png`, `styleguide-desktop-2.png` (footer)
- **Verify first:** (1) real `menu(handle: "main-menu")` response shape — does `MenuItem` expose a handle/resource, or must the handle be parsed from `url`? (2) native `<dialog>` for the mobile panel with React 19 / Next 16 via Context7; fall back to manual focus trap + `Escape` if it doesn't fit.
- Only the interactive part of `Header` is `"use client"`; RootLayout stays a Server Component. Mobile panel stays internal to `Header/`.
- `MenuItem` type in `src/types/catalog.ts` or a new `src/types/navigation.ts` (Claude's call).
- Nav/footer links to `/collections/[handle]` will 404 until `collection-page` — expected.
- Cart button is a visual placeholder only (no count, no drawer, no handler).
- Footer "Field Service" column omitted by default — flag as mockup deviation in the PR.
- No new atoms. No E2E (belongs to `e2e-and-a11y`).
- Out of scope: header search combobox (`search`), cart drawer/count (`cart`), collection route (`collection-page`), page-specific header variants.
- **Verified:** mock.shop menu items have `resource: null` and an absolute `url` (`https://apparel-outdoor.hydrogen.mock.shop/collections/<handle>`); `toMenuItem` keeps the pathname. Home is filtered by `type === "FRONTPAGE"`, not by title. Titles are the full collection names ("Summit Protection Shells"), not the mockup's short ones.
- **Verified:** jsdom 30 has no `showModal()`/`close()`; Header tests stub them and cover the component's wiring only. Real Escape, focus trap and focus return checked in Chromium via Playwright MCP.
- Decisions: layout fetches the menu once and passes it to Header/Footer; `Button` props widened to `ComponentPropsWithRef<"button">` (React 19 ref-as-prop); new tokens `--color-text-inverse-muted`, `--color-focus-ring-inverse` (slate ring invisible on slate footer) with contrast tests; desktop nav from `lg` (1280) because the full titles don't fit at 768.

## History

<!-- Completed features, oldest first. One line each: **Name** - summary (PR #n) -->

- **Initial Next.js setup** - Create Next App scaffold (Next.js 16.3.5, React 19.2.8, TypeScript, ESLint) plus project context docs and CLAUDE.md (direct to `main`, no PR)
- **Initial Setup** - Boilerplate removed, SCSS reset, strict TS (`noUncheckedIndexedAccess`), Prettier + editorconfig, Vitest/RTL with coverage, Node 24, MIT license (PR #1)
- **CI Pipeline** - GitHub Actions `ci` job (lint, format, typecheck, coverage ≥ 80% on `src/lib`, build), PR template, Dependabot, README placeholder with CI badge (PR #2)
- **GraphQL Layer** - Committed schema + graphql-codegen (client preset, drift check in CI), Apollo RSC client with `force-cache`/revalidate and client provider, catalog mappers/fetchers to domain types, Home lists collections from RSC, MSW + real-response fixtures, Vitest client/server projects; specs now committed on the feature branch (PR #7)
- **Design Tokens** - Two-tier CSS custom-property tokens (primitives → semantic), `bp()` breakpoint mixin, base typography + Slate focus ring, Libre Baskerville/IBM Plex Sans via `next/font`, AA-safe `--color-clay-dark`, Storybook 10 (nextjs-vite, docs, a11y) with a live Design Tokens page, token integrity/contrast test (PR #9)
- **Atoms** - `Button`, `Price`, `Badge`, `Swatch`, `Input`, `Spinner`, `VisuallyHidden` on semantic tokens with RTL tests and Storybook stories (axe 0 violations), `formatMoney` (`Intl.NumberFormat`, currency from data), `--color-primary-hover`/`--size-touch-target` tokens, component `var()` integrity test, `clsx`; no Hover stories (synthetic hover does not trigger `:hover`) (PR #10)
