# Product Page Spec

## Overview

Build `/products/[handle]`: the PDP — gallery, variant picker, price, quantity, an inert "Add to cart" (no `cart` feature yet), sanitized rich-text description, and `Product` JSON-LD — per `project-overview.md` §5.5 and `docs/html-sanitization.md`'s verified recommendation. This is the first feature to render Shopify's `descriptionHtml` and the first to use intrinsic (non-`fill`) `next/image` sizing for the gallery, both deferred here by `home-page`.

## Requirements

- `src/app/products/[handle]/page.tsx`: Server Component, `getProduct(handle)` (new fetcher, same "unknown handle → `notFound()`" pattern as `getCollection`).
- Gallery: product images, primary image large + thumbnails/scroll on mobile per `context/screenshots` PDP reference; intrinsic `width`/`height` `next/image` (not `fill`, unlike `ProductImage`'s grid usage) since PDP images have a knowable size slot, not a grid cell.
- Variant picker: `Swatch` atoms grouped by option (Color, Size, …) inside a `<fieldset>`/`role="radiogroup"` per `Swatch`'s existing design intent from `atoms`; selecting a variant updates price, image (if the variant has its own), and availability — via URL state (`?variant=<id>` or option-based, Zod-validated) so a shared link lands on the right variant, same "no client-only state that a refresh loses" principle as `sort`/`facets`.
- `QuantityStepper` molecule (named in `project-overview.md` §6, not yet built): increment/decrement + direct input, min 1, no upper bound beyond `availableForSale`/inventory if the API exposes it.
- Price via the existing `Price` atom, updating with the selected variant.
- "Add to cart" `Button`: present, styled, keyboard-operable, but **inert** — no click handler beyond a no-op or a disabled state — exactly the same placeholder treatment `layout-header` gave the cart trigger; `cart` feature wires it up.
- Out-of-stock / unavailable variant: selecting one disables "Add to cart" and shows a visible "Out of stock" state (not just a disabled button with no explanation) — check whether mock.shop's catalog actually has any unavailable variants before assuming this path is reachable; if none exist, this becomes a documented, deliberately untested-by-real-data path per §8's "empty state" precedent from `collection-page`.
- Description: `descriptionHtml` sanitized and rendered as HTML via the new `RichText` atom (see Technical) — **not** plain text, per the confirmed decision below.
- `BreadcrumbList` JSON-LD (Home → collection → product, if the product's collection context is known from the referring collection; otherwise Home → product) **and** `Product` JSON-LD (name, image, description, offers/price, availability) via the existing `JsonLd` component from `collection-page`.
- `generateMetadata`: canonical URL, OG tags with the product's primary image.
- `loading.tsx`, `error.tsx` for this route.

## Expected Behavior

- Normal: gallery, title, price, variant picker, quantity stepper, inert "Add to cart", sanitized description, breadcrumb.
- Unknown handle: 404, same pattern as `collection-page`.
- Changing a variant (e.g. picking a different color) updates the URL, price, and gallery image without a full reload; a direct link with `?variant=` (or equivalent) lands pre-selected.
- Description renders real HTML structure (paragraphs, lists) — not raw tags as visible text, not stripped-to-plaintext.
- No GraphQL requests from the browser — Server Component, same principle as every prior data-fetching feature.

## Technical

### Sanitization (`docs/html-sanitization.md` — read this before implementing, don't re-derive)

- New dependency: `sanitize-html@2.17.7` + `@types/sanitize-html@2.16.1` (dev) — **ask before installing**, per `ai-interaction.md`'s standing rule, even though this spec already names the exact verified versions.
- New `src/lib/sanitize/` (mirrors `src/lib/facets/`, `src/lib/format/` — one concern per lib folder): a pure function wrapping `sanitize-html` with an allowlist of exactly `<p>`, `<ul>`, `<li>` — matching what the live API actually returns today (verified in the research doc against all 30 products + 4 collections, zero attributes, zero entities), not a speculative wider Shopify rich-text set. No `<a>` in the allowlist, so the research doc's flagged-unverified `rel`/`target` question is moot — don't re-open it.
- Sanitization lives **only** inside the `RichText` atom (single choke point) — `src/lib/catalog/mappers.ts`/fetchers stay untouched, `descriptionHtml` passes through as a plain string until it reaches this one component, same principle as `JsonLd` owning its own escaping.
- `src/lib/sanitize/` runs `sanitize-html` — confirm at implementation time it still behaves correctly inside the RSC/Server Component render path (the research doc measured this in a throwaway harness and in this repo's own Vitest `client` project config, not inside a live Next.js request; a quick manual check on the real dev server is cheap insurance before calling it done).
- ESLint guardrails (both, per the research doc's recommendation): `no-restricted-imports` blocking `sanitize-html` imports from anywhere outside `src/lib/sanitize/`; `react/no-danger` enabled project-wide via `eslint-config-next`, allowed only at the `RichText` atom's own `dangerouslySetInnerHTML` line via a scoped inline disable comment (~10 lines, not a blanket file-level disable).
- CSP header — explicitly **not** this feature; add to `context/new-feature-list.md` if not already there.

### Components

- `src/components/atoms/RichText/RichText.tsx` (+ `.module.scss`, `.test.tsx`, `.stories.tsx`): takes a raw `html: string`, runs it through `src/lib/sanitize/`, renders via `dangerouslySetInnerHTML`. Atom, not a `ProductDescription` molecule — it doesn't know about the `Product` domain type, just renders sanitized markup, so `collection-page` can reuse it later for collection `descriptionHtml` without restructuring anything (`collection-page` shipped without this — flag as a small known gap, not in scope to retrofit here unless trivial).
- `src/components/molecules/QuantityStepper/` (+ tests/stories): controlled component, `value`, `onChange`, `min`, `max?`.
- `src/components/molecules/VariantPicker/` (or organism, depending on how much it ends up composing — Claude Code's call): groups `Swatch`es per option, reads/writes the URL-state variant selection.
- `src/components/atoms/Gallery/` or similar for the intrinsic-sized image set — confirm via Context7 whether a `next/image` intrinsic-size pattern needs anything different from `ProductImage`'s `fill` pattern before assuming it's a copy-paste.

### Data

- Extend `src/lib/graphql/documents/` with a `ProductByHandle` query: handle, title, `descriptionHtml`, images, variants (id, selected options, price, `availableForSale`), options.
- New fetcher `getProduct(handle: string)` in `src/lib/catalog/fetchers.ts`, new mapper(s) in `mappers.ts` — same "unknown handle → `null`" → `notFound()` pattern already established.
- Option-name normalization (`project-overview.md` §6, `src/lib/format/`) — this is the feature that actually needs it (matching a URL's `?color=moss` against the API's option value casing/spacing) — add it to `src/lib/format/` alongside `money.ts`, don't invent a second convention.

## UI

- Reference the PDP screenshots in `context/screenshots/` — direction only, same caveat as every prior UI feature.
- Touch targets ≥44px on swatches, quantity stepper buttons, "Add to cart".
- Focus-visible ring via the existing token, no new focus style.
- Out-of-stock state communicated with text, not color alone.
- `RichText`'s rendered content inherits body typography tokens — no bespoke prose styling that bypasses the type scale.

## Testing

- **Unit:** `src/lib/sanitize/` — the exact malicious-input cases the research doc already ran (`<script>`, `onerror`, `javascript:` href if ever allowed, mixed-case tag smuggling) plus the real-shape cases (paragraphs, lists) — this is the highest-value test in the feature, don't under-test it. `getProduct` fetcher (MSW) — found/unknown handle. Option-name normalization function.
- **Component (RTL):** `RichText` — renders sanitized output, strips a `<script>` in a test input even though production data never contains one (defense-in-depth is exactly the point). `QuantityStepper` — increment/decrement/direct-input, respects `min`/`max`. `VariantPicker` — selecting an option updates URL state (mock `useRouter`). Page test — variant switch updates price/gallery, out-of-stock disables "Add to cart" (if reachable — see Requirements), unknown handle 404s.
- **`generateMetadata` / JSON-LD:** `Product` and `BreadcrumbList` JSON-LD assert correct shape and `<` escaping (reuse `JsonLd`'s existing test pattern from `collection-page`).
- **Storybook + a11y addon:** `RichText`, `QuantityStepper`, `VariantPicker`/`Gallery` stories.
- **Manual:** confirm `RichText` renders correctly against a real product's `descriptionHtml` on the dev server (see sanitization note above) — one real check, not just mocked-data tests.
- No E2E yet — `e2e-and-a11y`.

## Out of Scope

- Actual "Add to cart" behavior, cart state, cart drawer — `cart` feature.
- Retrofitting `RichText` into `collection-page`'s collection descriptions — flagged as a known gap, not pulled into this feature's scope.
- CSP header — `new-feature-list.md`.
- A wider sanitize-html allowlist than the verified `p`/`ul`/`li` — revisit only if real catalog data changes.
- Product reviews, related products, or any PDP section not named above and not in `project-overview.md` §3/§5.

## Notes

- All four architectural decisions in `docs/html-sanitization.md`'s "Decisions I need from you" section are resolved: render sanitized HTML (not plain text); narrow allowlist matching verified live data (`p`, `ul`, `li`) — which also makes the doc's one flagged-unverified item (`rel`/`target` on `<a>`) moot, since `<a>` isn't allowed; sanitization lives only in the `RichText` atom, not duplicated into the mapper with a branded type; `RichText` is an atom, not a `ProductDescription` molecule, specifically so `collection-page` can reuse it later.
- `sanitize-html` + `@types/sanitize-html` are new dependencies — confirm install with Martin before running it, per standing project rule, even though the exact versions are already pinned by the research.
- This is the first feature needing intrinsic (non-`fill`) `next/image` sizing — don't assume `ProductImage`'s `fill` pattern transfers unchanged; verify via Context7 if anything about Next.js 16's intrinsic-image handling differs.

## Verify first (unverified in the research)

1. `docs/html-sanitization.md` measured `sanitize-html` in a throwaway harness and this repo's Vitest `client` project — not inside an actual Next.js Server Component request. Do one real manual check on the dev server against a live product's `descriptionHtml` before calling sanitization done.
2. Whether mock.shop's catalog has any `availableForSale: false` variant at all — determines whether the out-of-stock UI path is exercised by real data or is a documented-but-untested branch.
