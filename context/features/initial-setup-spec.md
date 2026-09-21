# Initial Setup Spec

## Overview

Turn the fresh `create-next-app` scaffold into the project's foundation: clean boilerplate, SCSS instead of plain CSS, strict tooling, the folder structure from the coding standards, and a working unit/component test runner. No visible features yet. The result is a blank page that builds, lints, typechecks and tests cleanly, so every later feature starts from the same baseline.

## Requirements

- Remove the create-next-app boilerplate:
  - `src/app/page.tsx` renders only a minimal placeholder: an `<h1>` "Summit Drift Outfitters" inside `<main>`
  - delete `page.module.css`, the default SVGs in `public/` and the default Geist font setup
  - `layout.tsx` keeps `lang="en"` and a proper `metadata` title/description for the store
- Styling:
  - install `sass`
  - replace `src/app/globals.css` with `src/styles/globals.scss` containing only a minimal modern reset (box-sizing, margin reset, media defaults, `prefers-reduced-motion` handling) and imported once from `layout.tsx`
  - create empty placeholders `src/styles/tokens.scss` and `src/styles/_breakpoints.scss` with a one-line comment saying they are filled by the design-tokens feature
- TypeScript:
  - confirm `strict: true` in `tsconfig.json`; also enable `noUncheckedIndexedAccess`
  - keep the `@/*` → `src/*` path alias
- Code quality tooling:
  - Prettier with a small config (`.prettierrc`) and `.prettierignore`; `eslint-config-prettier` so ESLint and Prettier don't conflict
  - keep the ESLint version required by `eslint-config-next` (do not upgrade ESLint on its own)
  - `.editorconfig` (2 spaces, LF, final newline)
- Testing (unit + component):
  - Vitest with a jsdom environment, React Testing Library, `@testing-library/jest-dom` and `@testing-library/user-event`
  - `vitest.config.ts` with the `@/*` alias, a setup file, and coverage via `@vitest/coverage-v8`
  - one real test: `src/app/page.test.tsx` renders the home page and finds the `<h1>` by role
- Folder structure from `context/coding-standards.md`, created only where it is used now: `src/styles/`, `src/lib/`, `src/types/`, `src/test/` (setup file). Component folders (`atoms/molecules/organisms`) are created by the features that add components.
- `package.json` scripts, exactly these names (they are referenced in CLAUDE.md):
  - `dev`, `build`, `start`, `lint`
  - `typecheck` → `tsc --noEmit`
  - `format` → `prettier --write .`, `format:check` → `prettier --check .`
  - `test` → `vitest run`, `test:watch` → `vitest`, `test:coverage` → `vitest run --coverage`
- `engines.node` in `package.json` and an `.nvmrc` matching the Node version the installed Next.js requires (check the Next.js docs, don't guess)
- `LICENSE` file (MIT, copyright Martin Vukalović, 2026)
- Update the Commands section in `CLAUDE.md` if any script name differs from what it lists

## Expected Behavior

- `npm run dev` shows a plain page with the heading "Summit Drift Outfitters"
- All of these pass with no errors or warnings: `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run test`, `npm run build`

## Technical

- Before touching Next.js config, fonts, metadata or file conventions, read the relevant guide in `node_modules/next/dist/docs/` (see `AGENTS.md`). This is Next.js 16.3.x.
- Check current setup docs for Vitest + React Testing Library with Next.js App Router via Context7. Note any limitations (e.g. async Server Components) in the Notes of `current-feature.md`.
- Server Components by default; the page stays a Server Component.
- Commit in small conventional commits on `feature/initial-setup` (e.g. `chore: remove boilerplate`, `build: add sass and prettier`, `test: set up vitest and rtl`).

## UI

None beyond the placeholder heading. Design tokens, fonts (Libre Baskerville + IBM Plex Sans) and real layout come in later features.

## Testing

- `src/app/page.test.tsx`: renders the page and asserts the level-1 heading is present (query by role).
- The test proves the whole toolchain works: jsdom, RTL, jest-dom matchers, path alias, SCSS/CSS module handling in tests.

## Out of Scope

- Design tokens, fonts, colors, Storybook
- GraphQL, Apollo, codegen
- Playwright / E2E, Lighthouse CI
- GitHub Actions CI (next feature: `ci-pipeline`)
- README content (a later feature writes the full README)

## Notes

- Warnings seen at install: `eslint@9 ... no longer supported` (comes from `eslint-config-next`, leave it) and npm `allow-scripts` for `unrs-resolver` (only approve with `npm approve-scripts unrs-resolver` if lint actually fails because of it).
- `AGENTS.md` and its `next dev` block stay committed as generated.
