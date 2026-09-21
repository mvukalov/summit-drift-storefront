# Feature Specs

One file per feature: `<kebab-name>-spec.md`. Copy `_spec-template.md` to start.
Large features are split into phases (`<name>-phase-1-spec.md`, `-phase-2-spec.md`).

## Suggested order

Specs are written one at a time, right before the feature starts.

1. **initial-setup** — bootstrap check, scripts, ESLint/Prettier, strict TS, folder structure
2. **ci-pipeline** — GitHub Actions: lint, typecheck, test; branch protection
3. **graphql-layer** — codegen, Apollo clients (RSC + client), fragments, first query
4. **design-tokens** — tokens.scss, globals, breakpoints, Storybook setup
5. **atoms** — Button, Price, Badge, Swatch, Input, Spinner with stories and tests
6. **layout-header** — header with menu from the API, footer, skip link
7. **home-page**
8. **collection-page** — grid + sort
9. **facets** — derived facets, URL state (phase 1: logic + tests, phase 2: UI)
10. **product-page** — gallery, variant picker, sanitized description, recommendations
11. **cart** — cart drawer, optimistic updates, rollback, cookie
12. **search** — results page, then predictive combobox
13. **e2e-and-a11y** — Playwright flows + axe in CI
14. **performance** — image optimization, before/after measurements, Lighthouse CI budgets
15. **readme-and-deploy** — Vercel, Storybook deploy, README with decisions and numbers
