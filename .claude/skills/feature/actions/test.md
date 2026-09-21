# Test Action

1. Read current-feature.md to understand what was implemented.
2. Run `git diff main --name-only` to see what changed.
3. Decide what is worth testing — logic, behaviour and user flows, not lines of code:
   - **Unit (Vitest):** pure functions in `src/lib/` and custom hooks. Happy path, edge cases, error cases.
   - **Component (React Testing Library):** interactive components — query by role/label, interact with `userEvent`, assert what the user sees. Mock GraphQL at the network boundary.
   - **E2E (Playwright):** only if the feature adds or changes a user flow. Include an axe accessibility check for new pages.
4. Check which tests already exist; extend them instead of duplicating.
5. Write the missing tests next to the source (`*.test.ts(x)`) or in `e2e/`.
6. Run `npm run test` (and `npm run test:e2e` if E2E changed). All must pass.
7. Run `npm run test:coverage` and report coverage for the files touched by this feature. Flag anything in `src/lib/` below 80%.
8. Do not write tests just to raise coverage. Explain briefly what is intentionally not tested.
