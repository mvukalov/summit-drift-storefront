# GraphQL Layer Spec

## Overview

Set up the typed data layer that every page will use: graphql-codegen with a committed schema, the Apollo RSC client and client provider from the official Next.js integration, the first GraphQL documents, and a first vertical slice (collections on the Home page) that goes RSC → Apollo → mapper → domain type → props. Also set up the test infrastructure (fixtures from real API responses, MSW, Vitest browser condition) and a CI check that generated types never drift.

All architectural choices are already made. The source of truth is `docs/apollo-nextjs.md`, especially the **Decisions** section. Where this spec and that doc disagree, the Decisions section wins; stop and ask.

## Step 0: spec on the feature branch (process change)

`main` is now protected (PR + green `ci` required), so specs can no longer be pushed to `main` directly. From this feature on, the spec is the first commit on the feature branch.

This time the workflow doesn't support it yet, so do it manually, before anything else:

1. Create `feature/graphql-layer` from an up-to-date `main`. The only uncommitted file should be this spec.
2. Commit the spec: `docs: add graphql-layer spec`.
3. Update `.claude/skills/feature/actions/start.md` so future runs do this automatically:
   - The "working tree must be clean" check allows exactly one untracked file: the loaded feature's spec in `context/features/` (or `context/fixes/`). Anything else still blocks.
   - After creating the branch, commit that spec as `docs: add <name> spec` before any other change.
4. Update `context/ai-interaction.md` (and `context/features/README.md` if it says otherwise) so it states that specs are committed on the feature branch, not on `main`.
5. Commit steps 3–4 as `chore: commit specs on the feature branch`.

## Requirements

### Dependencies

- Install as in `docs/apollo-nextjs.md` → Implementation outline §1: `@apollo/client`, `@apollo/client-integration-nextjs`, `graphql`, `rxjs`; dev: `@graphql-codegen/cli`, `@graphql-codegen/client-preset`, `msw`.
- `npm install` must succeed **without** `--force` or `--legacy-peer-deps`. If `graphql` 17 causes peer conflicts, use the latest `graphql` 16.x. Record the result in Notes.
- Pin `@apollo/client-integration-nextjs` to an exact version (it is 0.x, so minor versions may break). Dependabot proposes updates.
- Ask before installing (as always).

### Schema and codegen

- `schema.graphql` at the repo root, committed (Decision 5).
- `npm run codegen:schema`: a small script (e.g. `scripts/fetch-schema.mts`) that runs an introspection query against the live API and writes `schema.graphql` with `graphql`'s `buildClientSchema` + `printSchema`. No new dependency for this. Run manually only.
- `codegen.ts` as in the Implementation outline §3: reads the local `schema.graphql`, documents from `src/lib/graphql/documents/**/*.graphql`, client preset, `fragmentMasking: false` (Decision 3), `strictScalars` with the scalar map. Fix the scalar list from the first run's output.
- `npm run codegen`: generates into `src/lib/graphql/generated/`. The output is committed and never edited by hand (Decision 6).
- Add `src/lib/graphql/generated/` and `schema.graphql` to `.prettierignore` and to the ESLint ignores, so `format:check` and `lint` don't fail on generated files.

### Documents (only what this feature uses)

- `fragments.graphql`: `Money`, `Image`, `ProductCard` (handle, title, featured image, price range, compare-at price range; enough for `isOnSale`).
- `collection.graphql`:
  - `Collections`: all collections for the Home page (handle, title, description, image).
  - `CollectionByHandle`: one collection plus its products (`first: 250`) using the `ProductCard` fragment. This is the base for the collection page and facets later.
- Other documents from the outline (product, search, cart, menu) are **not** part of this feature. Each comes with its own feature.

### Apollo clients

- `src/lib/graphql/config.ts`: API URL, headers (`X-Shopify-Storefront-Access-Token: public`), `REVALIDATE_SECONDS` (3600), cache tag constants. Plain constants: the endpoint and token are public, so no env variables.
- `src/lib/graphql/rsc-client.ts`: `registerApolloClient` with `HttpLink` and `fetchOptions: { cache: "force-cache", next: { revalidate, tags } }` (Decision 2), `import "server-only"`. Must support a per-query `context: { fetchOptions }` override (Decision 4). Show that the override works (a unit test or a documented manual check).
- `src/lib/graphql/ApolloWrapper.tsx`: `"use client"`, `ApolloNextAppProvider` with a browser client. Mounted in `src/app/layout.tsx` around `children`.
- Import `ApolloClient` and `InMemoryCache` from the integration package, and React hooks from `@apollo/client/react` (Apollo 4).

### Domain layer

- Domain types (`CollectionSummary`, `ProductCard`, `Money`), derived from the generated types as in `project-overview.md` §7. No hand-written response types.
- `src/lib/catalog/mappers.ts`: pure functions, no Apollo or React imports:
  - `toCollectionSummary`
  - `toProductCard`, including `isOnSale` (a variant's compare-at price is higher than its price) and the price shown on the card
- `src/lib/catalog/` fetchers (`import "server-only"`):
  - `getCollections(): Promise<CollectionSummary[]>`
  - `getCollection(handle): Promise<{ collection: CollectionSummary; products: ProductCard[] } | null>`; an unknown handle (API returns `null`) returns `null`, so pages can call `notFound()`.
- Error handling follows `context/coding-standards.md`. GraphQL errors (`errors[]`) and network errors must not be silently turned into empty data.

### First vertical slice

- `src/app/page.tsx` renders the four collection titles as a plain list, fetched with `getCollections()` in the Server Component. No styling and no Apollo in the browser for this. It's a temporary proof, and the `home-page` feature replaces it.
- In the dev server, check that the Home page makes one request per operation and that a reload is served from the fetch cache. Record how you checked it in Notes.

### Tests

- **Fixtures** in `src/test/msw/fixtures/`, captured once from real mock.shop responses (`Collections`, `CollectionByHandle` for one collection, and an unknown handle). Store them as `.ts` files typed with the generated query types (`satisfies CollectionsQuery`), and note the capture date in a comment.
- **Mapper unit tests** with the fixtures: happy path, a product on sale and one not on sale, missing image, empty collection.
- **Fetcher tests** in the Node environment with MSW (`graphql.link(url)`, typed handlers): success, unknown handle → `null`, GraphQL error, network error. Handle `server-only` in tests (alias or mock).
- **MSW setup**: `src/test/msw/server.ts` + handlers, `onUnhandledRequest: "error"`, reset in `afterEach`, close in `afterAll`.
- **Provider smoke test**: render a child inside `ApolloWrapper` with RTL. This proves the Vitest `browser` export condition and `resetApolloClientSingletons` setup work.
- Coverage ≥ 80 % on `src/lib/**` must pass. From this feature on, the threshold is no longer trivial.

### CI

- Add a step to `.github/workflows/ci.yml` after `npm ci` and before `Typecheck`, named clearly (e.g. "Codegen drift check"):
  `npm run codegen && git diff --exit-code src/lib/graphql/generated`
- Prove it: on the branch, push a temporary commit that changes a `.graphql` document without regenerating, confirm CI goes red on that step, then revert. Put both run URLs in the PR's Evidence (same pattern as the ci-pipeline PR).

## Verify first (unverified in the research)

Check these at the start of implementation and record the outcome in Notes. If one fails, stop and ask:

1. `graphql` 17 installs cleanly with Apollo 4, codegen 7 and MSW 2 (otherwise 16.x).
2. The exact Vitest 5 config for the `browser` export condition.
3. The codegen scalar list (the first `strictScalars` run lists what's missing).

Deferred to `product-page` (not checked here): whether `generateMetadata` and the page share one Apollo client per request.

## Expected Behavior

- `npm run codegen` regenerates identical files on a clean checkout.
- The Home page shows the four collection titles, rendered on the server. There are no GraphQL requests from the browser (check the Network tab).
- An unknown collection handle makes `getCollection` return `null`.
- The CI run is green, including the new drift check. Changing a document without regenerating makes CI red on that step.

## Technical

- Architecture rule from the research: **RSC and client queries never overlap.** Catalog data is fetched only in Server Components and passed down as plain domain-type props. The browser Apollo cache is reserved for the cart and predictive search (later features).
- `cacheComponents` stays off (Decision 2). Don't add `"use cache"`.
- The API accepts POST only (GET → 405), so don't enable `useGETForQueries`.
- Business logic stays in `src/lib/` as pure TypeScript (coding standards). Components never import generated GraphQL types directly.
- Use Context7 for current APIs (Apollo integration, codegen, MSW, Vitest). Don't write APIs from memory.

## Testing

- Unit: mappers (fixtures), fetchers (MSW, Node env).
- Component: provider smoke test (RTL).
- CI: drift check proven with a deliberate red run.
- Manual: Home page list, network check, dev log (one request per operation).

## Out of Scope

- Product, search, cart and menu documents, and their fetchers.
- Any styling or design tokens (the `design-tokens` feature).
- `PreloadQuery` and client-side queries (the `cart` and `search` features).
- Storybook and `msw-storybook-addon`.
- Images and `next/image` `remotePatterns` (the `performance` / `home-page` features).
- The README trade-off text for Decision 2 (written in `readme-and-deploy`; keep a one-line note in Notes).

## Notes

- Source of truth: `docs/apollo-nextjs.md` → Decisions, Verified facts, Implementation outline, Testing strategy.
- Remembered for this feature from earlier planning: fixtures from real mock.shop responses typed by codegen (for tests now, Storybook later). The `src/lib` coverage threshold is already enabled by ci-pipeline.
- Next `/feature` process: specs are committed on the feature branch (Step 0).
