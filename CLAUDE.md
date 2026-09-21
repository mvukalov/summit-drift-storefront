# Summit Drift Storefront

Headless storefront for Summit Drift Outfitters (fictional outdoor brand) on the Shopify Storefront GraphQL API served by mock.shop. Frontend-only portfolio project: typed GraphQL, SCSS design system, tested flows, measured performance.

## Context Files

Read these for full project context:

- @context/project-overview.md — data source, API capabilities and quirks, features, architecture, quality gates
- @context/coding-standards.md — code conventions and patterns
- @context/ai-interaction.md — workflow, Git/PR rules, communication
- @context/current-feature.md — what we are working on right now
- @AGENTS.md — Next.js version-specific rules; read the bundled docs in `node_modules/next/dist/docs/` before using Next.js APIs

## Commands

Scripts are added by the setup features. Only use scripts that exist in `package.json`.

- **Dev**: `npm run dev` (http://localhost:3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Unit/component tests**: `npm run test` (single run), `npm run test:watch`, `npm run test:coverage`
- **E2E**: `npm run test:e2e`
- **GraphQL types**: `npm run codegen` (run after changing any `.graphql` document)
- **Storybook**: `npm run storybook`, `npm run build-storybook`
- **Lighthouse CI**: `npm run lhci`

## API

- Endpoint: `https://apparel-outdoor.mock.shop/api`, header `X-Shopify-Storefront-Access-Token: public`
- No secrets. There is no real checkout, customer data or payments.
- The API **ignores filters**. Facets are computed in `src/lib/facets/` (see project overview §5.1).

## Critical Rules

- **IMPORTANT:** Never commit, push, merge or open a PR without my explicit approval.
- **IMPORTANT:** Never commit unless lint, typecheck, tests and build pass.
- **IMPORTANT:** Do not add Claude or AI attribution to commit messages or PR descriptions.
- **IMPORTANT:** Never hand-write GraphQL response types. Use generated types from codegen.
- **IMPORTANT:** For library APIs (Next.js 16, Apollo, Storybook, Playwright, Lighthouse CI), check current docs via Context7 instead of relying on memory.
