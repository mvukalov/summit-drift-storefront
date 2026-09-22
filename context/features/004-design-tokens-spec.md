# Design Tokens Spec

## Overview

Fill the three placeholder style files left by `initial-setup` (`src/styles/tokens.scss`, `_breakpoints.scss`, `globals.scss`) with the project's real design tokens — colors, typography scale, spacing, radii, shadows, breakpoints — as CSS custom properties, and set up Storybook so the tokens have a living, browsable style guide instead of the static `context/screenshots/styleguide-desktop-*.png` mockup. No components are built here (that's `atoms`); this feature only makes the tokens exist and be visible.

## Requirements

- `src/styles/tokens.scss`: CSS custom properties on `:root` for color, typography, spacing, radii, shadows, z-index — primitive tokens (`--color-slate`, `--color-clay`, …) plus semantic tokens built from them (`--color-background`, `--color-text`, `--color-accent`, `--color-border`, …), per `coding-standards.md`'s "only design tokens, no hard-coded hex" rule.
- `src/styles/_breakpoints.scss`: mobile-first (`min-width`) SCSS mixins for the project's three test breakpoints (375 / 768 / 1280, from `project-overview.md` §8).
- `src/styles/globals.scss`: keep the existing reset, add base typography (`font-family`, base color/background) wired to the new tokens.
- Storybook installed and configured for this Next.js 16 / React 19 project, with an accessibility addon (the project's stated a11y target is WCAG 2.2 AA), previewing with the app's real `globals.scss`/tokens.
- A tokens documentation story/page in Storybook (colors with names + hex, type scale, spacing scale) — this becomes the reviewable style guide going forward, replacing the Lovable mockup as the source of truth.
- `npm run storybook` script in `package.json`.

## Expected Behavior

- `npm run storybook` starts locally and shows a "Design Tokens" page: color swatches with names and hex values, the heading/body type scale, the spacing scale — enough for someone to review the visual language without opening the app.
- The existing `/` route (still the temporary collection-title list from `graphql-layer`) picks up the base font and background color from `globals.scss` automatically — no component changes needed to see this.
- `npm run lint`, `typecheck`, `test`, `build` all still pass; `page.test.tsx` is unaffected (it doesn't assert on styling).

## Technical

- Tokens are real CSS custom properties (`:root { --color-slate: #333a45; }`), not SCSS `$variables` — so any component can consume them with `var(--color-slate)`, and Storybook can theme against the same source without a SCSS build step for JS.
- Two-tier token structure: primitives (raw palette/scale values) → semantic aliases (what a component actually reaches for, e.g. `--color-surface`, `--color-on-accent`). Components in later features use only the semantic layer.
- Storybook setup: confirm the current Storybook major version and its Next.js 16 / React 19 / Vite-builder compatibility via Context7 before installing — don't assume the API from training data (`ai-interaction.md` rule). Same for whichever accessibility addon is current.
- Wire Storybook's preview to import `src/styles/globals.scss` so stories render with real tokens, not Storybook's defaults.
- No `src/components/` changes — `atoms` is the next feature and consumes these tokens.

## UI

Reference: `context/screenshots/styleguide-desktop-1.png` and `-2.png` (a Lovable prototype — UX/direction reference only, per the project's workflow rules; not a pixel-exact spec).

**Confirmed directly from the mockup's own labels** (treat as fact, not estimate):

- Colors: Slate `#333A45`, Clay `#B5623F`, Sand `#D9C8A8`, Cream `#F2ECDF`, Soft cream `#F8F4EA`.
- Spacing scale: `4px 8px 16px 24px 32px 48px`.

**Visible in the mockup but not labeled with exact values** — implement by eye against the screenshots, Martin's call, not a measurement to extract from a flat PNG:

- Border radius (buttons/inputs look ~8–10px, cards look larger).
- Shadow depth on the three card placeholders.
- Focus-ring color (looks like a blue outline, not one of the five palette colors — confirm this is intentional or a Lovable default before locking it into `--color-focus-ring`).
- Button/input states shown: Primary (slate fill), Secondary (cream fill, slate border), Ghost, Hover, Focus, Disabled, Loading — these inform the *token* names needed (e.g. `--color-disabled-text`) even though the Button component itself isn't built yet.

**Not in scope for this feature:** the per-option swatch colors visible in the mockup (Slate/Moss/Clay dots under "Badges, swatches & quantity") — the mockup gives no hex for Moss, and nothing consumes a swatch-color token until the `atoms` feature builds the `Swatch` component. Adding them now would be guessing.

**Typography:** the mockup uses a serif for headings and a sans-serif for body/UI text, but names no font (Lovable default, not a brand choice recorded anywhere else in `context/`). Pick real font(s) — system stack or a licensed webfont — as an implementation decision, not an assumption; flag it if unsure rather than silently picking one.

## Testing

No unit tests — this feature is SCSS + Storybook config, no logic. Verification is:

- Local gate: `lint`, `format:check`, `typecheck`, `test`, `build` all green (existing tests must still pass unchanged).
- Manual: `npm run storybook` runs, the tokens documentation page renders all colors/type/spacing correctly; spot-check the app in the dev server still renders (no broken `globals.scss`).

## Out of Scope

- Any atom/molecule/organism component (`Button`, `Price`, `Badge`, `Swatch`, `Input`, `Spinner`, `Header`, …) — `atoms` and `layout-header` features.
- Per-option swatch color tokens (moss, fern, stone, charcoal) — added when `atoms` builds `Swatch`.
- Restyling `src/app/page.tsx` beyond what `globals.scss` applies automatically — the real Home page redesign is a later pass on the `home-page` feature.
- Dark mode / multi-theme support (not part of the MVP).
- Storybook deployment (Vercel/static hosting) — that's `readme-and-deploy`.

## Notes

- This replaces the earlier plan to jump straight to `home-page` at spec number `004`. That draft spec was never placed in `context/features/`, so no number was actually consumed — `design-tokens` takes `004` and the project stays on the README's suggested order (`design-tokens` → `atoms` → `layout-header` → `home-page`).
- Colors and the spacing scale are taken as given from the mockup's own on-screen labels — verified facts, not visual estimates. Radius, shadow, focus-ring color and font family are open implementation decisions informed by the mockup, per the project's rule that a Lovable prototype is UX reference only, never production spec.
- Confirm the current Storybook + Next.js 16/React 19 setup via Context7 before installing (`Verify first`).
