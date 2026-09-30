# Footer Attribution

Adds an author credit and a short disclaimer to the site footer. This is a `fix/` PR (small scoped addition), not a full `/feature`.

## Why

The deployed app is the portfolio piece, but nothing on the page says who built it or where the code lives. Someone opening the live link (a recruiter, a reviewer) should see both without going through the README.

A classic "© 2026 … All rights reserved." was considered and rejected:

- Copyright applies without a notice, and the code is already covered by `LICENSE` (MIT, `Copyright (c) 2026 Martin Vukalović`). "All rights reserved" would contradict that license.
- The product data and images come from mock.shop, so a blanket copyright claim over the page would be inaccurate.
- "© Summit Drift" is out too: the brand is fictional.

## Requirements

- A bottom row in `Footer`, below the existing brand and collections columns, spanning the full width:
  - "Portfolio project by Martin Vukalović", with a "Source on GitHub" link to `https://github.com/mvukalov/summit-drift-storefront`.
  - "Summit Drift is a fictional brand. Product data and images come from mock.shop. No real orders are placed."
- The row renders whether or not the menu has items.

## UI

- Muted inverse text at the small text size, separated from the columns above by a thin divider.
- Tokens only. A new semantic `--color-divider-inverse` for the divider on the slate footer, since the existing `--color-divider` (sand-dark) is meant for light surfaces.
- The GitHub link keeps the footer's existing link treatment: 44px touch target, underline on hover, the inverse focus ring.

## Testing

- `Footer.test.tsx`: the credit text is present and the GitHub link points at the repo, also when there are no menu items.
- Storybook: existing stories pick the row up; axe stays at 0 violations.
- Contrast: muted inverse text on the slate surface is already an established, AA-passing pair in this footer (the blurb).

## Out of Scope

- A copyright line, a year, legal pages.
- Any change to the README (it already credits the author).
