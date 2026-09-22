# Atoms Spec

## Overview

Build the six atoms from `coding-standards.md`'s design system list — `Button`, `Price`, `Badge`, `Swatch`, `Input`, `Spinner` — plus `VisuallyHidden`, the accessibility utility the same list names. Each is a small, presentational component consuming only the semantic tokens from `design-tokens`, with a Storybook story per state and a component test. Nothing here composes them into molecules (`ProductCard`, `QuantityStepper`, …) or fetches data — atoms don't know about GraphQL, routes, or the catalog domain, except `Price`, which formats the `Money` domain type since that's the one place a raw money-formatting concern needs a home.

## Requirements

- `src/components/atoms/<Name>/<Name>.tsx` + `.module.scss` + `.test.tsx` + `.stories.tsx` for: `Button`, `Price`, `Badge`, `Swatch`, `Input`, `Spinner`, `VisuallyHidden`.
- Every component/props typed (no `any`), documented with a props interface.
- Every visual state from the style guide mockup (`context/screenshots/styleguide-desktop-1.png`/`-2.png`) has a Storybook story: default, hover, `:focus-visible`, disabled, loading, where applicable to that component.
- `clsx` added as a dependency (ask first, per project rule) for conditional class composition — nothing here needs more than that.
- `src/lib/format/money.ts`: a pure `formatMoney(money: Money): string` function (first thing in `src/lib/format/`, which didn't exist before this feature), unit-tested, used by `Price`.
- All styling through semantic tokens only — no hex values, no hard-coded spacing, consistent with `design-tokens`.

## Expected Behavior

Each atom rendered in isolation in Storybook, matching its states from the mockup:

- **Button** — `primary` (slate fill), `secondary` (cream fill, slate border), `ghost` (no fill/border); `disabled`; `loading` (spinner replaces/join text, interaction blocked, `aria-busy`).
- **Price** — current price formatted from a `Money` value; when `compareAtPrice` is given and `isOnSale` is true, it renders struck through next to the current price (current price in the accent/sale color, compare-at price muted).
- **Badge** — a small pill with text and a `tone` (`accent` for "Sale"-style use, `neutral` for anything else later) — generic, not hardcoded to the word "Sale".
- **Swatch** — a colored circle + visible text label in a bordered pill, selectable (native radio semantics), with `default` / `selected` / `:focus-visible` / `disabled` states. The circle's color comes from a `color` prop (a CSS color string) — **not** a fixed set of named tokens; see Technical.
- **Input** — labeled text input (`<label>` associated via `htmlFor`/`id`), optional leading icon slot (for the mockup's search input), `disabled` state.
- **Spinner** — small indeterminate loading indicator, `role="status"`, respects `prefers-reduced-motion` (already handled globally, but the spinner's own animation must degrade too, not just rely on the global override silently working).
- **VisuallyHidden** — renders children off-screen but reachable by screen readers; no visual output.

## Technical

- File layout per `coding-standards.md` §File Organization: `src/components/atoms/Button/Button.tsx`, etc.
- `Button`: native `<button>` only (no polymorphic `as="a"` yet — nothing needs a link-styled button in this feature; add it when a real use case shows up, per "no nice-to-haves"). Props: `variant: 'primary' | 'secondary' | 'ghost'`, `loading?: boolean`, `disabled?: boolean`, plus standard button props. Loading disables the button and shows `Spinner` + a `VisuallyHidden` "Loading" label so screen readers get feedback, not just a visual spinner.
- `Price`: props are exactly the price-shaped slice of the `ProductCard` domain type — `price: Money`, `compareAtPrice?: Money | null`, `isOnSale?: boolean` — so a future `ProductCard` molecule can spread `product` straight in. Formatting goes through `formatMoney` (`src/lib/format/money.ts`), using `Intl.NumberFormat` with the `Money.currencyCode` — don't hard-code `"USD"` even though it's the only currency the API currently returns (`project-overview.md` §2). The compare-at price renders in a `<del>` with a `VisuallyHidden` "Original price:" prefix, not color alone (`coding-standards.md` §Accessibility).
- `Badge`: props `children` (text) + `tone`. No `"Sale"` string baked in — the collection/product feature decides the text later.
- `Swatch`: props `color` (CSS color string), `label` (always visible text, never color-only), `name` (radio group name — native `<input type="radio">` under the hood so a later `VariantPicker` organism can group several `Swatch`es in a `<fieldset>`/`role="radiogroup"` without reimplementing selection logic), `selected`, `disabled`, `onChange`. **Swatch does not define or import any named colors** (no "moss", "clay" tokens) — the actual option-value → color mapping is catalog data, decided per collection at runtime, and belongs in a pure lookup function added when `product-page`/variant picker needs it, not baked into the design system now. (This corrects the plan noted in `004-design-tokens-spec.md`, which assumed those would become tokens here — they don't; keeping them out of `tokens.scss` avoids hard-coding catalog data into global design tokens.)
- `Input`: props `label`, `id` (or auto-generated via `useId`), `type`, `icon?: ReactNode` (leading, `aria-hidden`), rest spread onto the native `<input>`. No error/validation state yet — nothing in the codebase produces one until `facets` or `search`; add it there instead of guessing the shape now.
- `Spinner`: props `size?` (one size is enough for now — `Button`'s loading state is the only consumer), pure CSS animation (`@keyframes`) gated by the existing global `prefers-reduced-motion` rule in `globals.scss`, plus a local check so the spinner shows a static (non-spinning) indicator rather than relying only on the global override.
- `VisuallyHidden`: standard clip-rect/absolute-positioning pattern, as a reusable component (not a SCSS-only utility class) so it composes into JSX cleanly.
- Storybook: one `.stories.tsx` per atom, `autodocs` (per the `design-tokens` Storybook setup), each state as its own named story so the a11y addon checks every state, not just the default.

## UI

- Reference `context/screenshots/styleguide-desktop-1.png` (buttons/inputs row) and `-2.png` (badges/swatches/product card) — same caveat as `design-tokens`: the mockup is UX direction, not a pixel spec. Use the tokens from `tokens.scss` (radii, shadows, spacing) rather than re-measuring the PNG.
- Touch targets ≥ 44×44px (`coding-standards.md` §Accessibility) — applies to `Button`, `Input`, and the clickable area of `Swatch` (the label + circle together, not just the circle).
- `:focus-visible` on every interactive atom uses the existing global focus-ring token (`--color-focus-ring`, already wired in `globals.scss`) — don't redefine focus styles per component.
- Color is never the only signal: `Swatch` always shows its text label; `Badge`/sale price never relies on color alone for the "on sale" meaning where it matters (the struck-through compare-at price already provides a non-color signal for `Price`; a future `ProductCard` molecule is responsible for pairing a `Badge` with visible "Sale" text on the image corner).

## Testing

- **Component (RTL):** one `.test.tsx` per atom — behavior, not implementation: renders with the right role/label, responds to interaction (`Button` click, `Swatch`/`Input` change), reflects `disabled`/`loading` state via ARIA attributes, not just CSS classes.
- **Unit:** `src/lib/format/money.test.ts` — different currencies, whole vs. fractional amounts, zero. This is `src/lib/`, so it counts toward the ≥80% coverage gate.
- **Storybook + a11y addon:** every story (every state) passes the addon's checks — contrast, roles, labels. Run it, don't just assume green.
- No E2E here — atoms in isolation aren't a user flow; that's `e2e-and-a11y` later, against real pages.

## Out of Scope

- `ProductCard`, `QuantityStepper`, `FacetGroup`, `SearchCombobox` and any other molecule — next up per the atomic layering, but not this feature.
- `Header`, `Footer`, or any organism.
- The option-value → swatch-color mapping (moss/clay/etc.) — deferred to whichever feature first needs it (likely `product-page`).
- `Input` error/validation states.
- A link-styled `Button` variant.
- Restyling `src/app/page.tsx` with these atoms — that's the `home-page` feature.

## Notes

- Corrects `004-design-tokens-spec.md`'s assumption: per-option swatch colors are not going to become design tokens; `Swatch` takes a `color` prop instead, keeping catalog data out of the global token set. Worth a one-line mention in the `design-tokens` learning doc if it's re-read later.
- `clsx` is a new dependency — ask before installing, per `ai-interaction.md`.
- `src/lib/format/` is created by this feature (first file: `money.ts`). `option-name normalization`, the other function `project-overview.md` §6 lists for that folder, isn't needed yet — it belongs to whichever feature first renders option names (likely `product-page`).
