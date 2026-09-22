# Feature Specs

One file per feature: `NNN-<kebab-name>-spec.md`. Copy `_spec-template.md` to start.

- `NNN` is a zero-padded, three-digit sequence number (`001`, `002`, …), assigned when the spec is written: take the next free number.
- Numbers are never reused or renumbered. A dropped feature keeps its number.
- Large features are split into phases that share one number (`009-facets-phase-1-spec.md`, `009-facets-phase-2-spec.md`).
- The number is only for ordering files. Branch names and `/feature load` use the name without it (`feature/ci-pipeline`, `/feature load ci-pipeline`).
- `context/fixes/` uses the same format with its own sequence.

## Suggested order

Specs are written one at a time, right before the feature starts.

1. **initial-setup** — bootstrap check, scripts, ESLint/Prettier, strict TS, folder structure
2. **ci-pipeline** — GitHub Actions: lint, typecheck, test; branch protection
3. **graphql-layer** — codegen, Apollo clients (RSC + client), fragments, first query
4. **design-tokens** — tokens.scss, globals, breakpoints, Storybook setup
5. **atoms** — Button, Price, Badge, Swatch, Input, Spinner with stories and tests
6. **layout-header** — header with menu from the API, footer, skip link
7. **home-page** — replaces the temporary collection list from graphql-layer; add `loading.tsx` and `error.tsx` for `/`
8. **collection-page** — grid + sort
9. **facets** — derived facets, URL state (phase 1: logic + tests, phase 2: UI)
10. **product-page** — gallery, variant picker, sanitized description, recommendations
11. **cart** — cart drawer, optimistic updates, rollback, cookie
12. **search** — results page, then predictive combobox
13. **e2e-and-a11y** — Playwright flows + axe in CI
14. **performance** — image optimization, before/after measurements, Lighthouse CI budgets
15. **readme-and-deploy** — Vercel, Storybook deploy, README with decisions and numbers
