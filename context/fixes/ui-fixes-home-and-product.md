# UI Fixes — Home Page & Product Page

Cosmetic issues found after `readme-and-deploy` shipped. No behavior or data changes — layout and spacing only. This is a `fix/` PR, not a `/feature` (unrelated to any spec, found post-launch).

Target reference (direction only, from a Lovable mockup — reimplement in this codebase's actual components/SCSS, don't copy Lovable's markup/code):

- `context/screenshots/ui-fixes/Home_page_desktop_fix.png`
- `context/screenshots/ui-fixes/PP_desktop_01_fix.png`
- `context/screenshots/ui-fixes/PP_desktop_02_fix.png`

## 1. Home hero — remove the right-side image

The hero section on `/` currently shows a product image (a jacket) on the right with no name or price — it reads as an unfinished/stray element, not an intentional design piece.

**Fix:** remove that image entirely. The hero content (eyebrow label, headline, subtext, "Shop the collection" / "Shop sale" buttons) should take the full section width instead, as shown in `Home_page_desktop_fix.png` — nothing added on the right side, no replacement image or background visual.

## 2. Home page — cramped padding and oversized collection cards

- Overall side/section padding on `/` is too tight — content sits too close to the viewport edges.
- The collection/category cards below the hero are oversized: at standard viewport widths they don't fully fit and force horizontal scroll. Compare with the collection/facets page, which already gets this right.

**Fix:** increase home page padding to match the spacing used on the collection page. Resize the collection cards (or their grid) so a full row fits within the viewport at common breakpoints (at minimum 375px and 1280px, matching the project's existing test viewports) without horizontal overflow.

## 3. Product page — oversized image, cramped right column

- The product image doesn't fit within the viewport — it's too large and requires scrolling to see the full image.
- The right column (title, price, options, quantity, add-to-cart) is too wide relative to the image column and sits too close to the edge. The "Add to cart" button stretches too wide; it should have a sensible max-width rather than filling the full column width.

**Fix:** constrain the product image to fit the viewport appropriately (check both 375px and 1280px). Add right-side padding to the text column and cap the button's width so it doesn't stretch edge-to-edge, as shown in the two PDP reference screenshots.

## Scope

- Visual/CSS only — no changes to product data, cart logic, variant selection logic, or any other behavior.
- Touch targets must stay ≥44px and focus-visible states must remain intact after resizing (existing accessibility bar, don't regress it).
- No new dependencies.

## Verify

- Check both 375px and 1280px viewports (project's existing convention) for all three fixes.
- Confirm no CLS regression — these are layout changes, so measure before/after Lighthouse mobile once, sanity-check CLS is still 0.
- Run the existing Playwright/axe suite — these pages already have E2E and a11y coverage; confirm nothing broke.
