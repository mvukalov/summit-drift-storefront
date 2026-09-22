# Current Feature: GraphQL Layer

## Status

In Progress

## Goals

### Step 0: spec on the feature branch

- [x] `feature/graphql-layer` from up-to-date `main`; commit spec as `docs: add graphql-layer spec`
- [x] `.claude/skills/feature/actions/start.md`: clean-tree check allows only the loaded spec as untracked; commit it as `docs: add <name> spec` right after branching
- [x] `context/ai-interaction.md` (+ `context/features/README.md` if needed): specs are committed on the feature branch
- [x] Commit as `chore: commit specs on the feature branch`

### Dependencies

- [x] Install `@apollo/client`, `@apollo/client-integration-nextjs` (exact pin), `graphql`, `rxjs`; dev: `@graphql-codegen/cli`, `@graphql-codegen/client-preset`, `msw`, with no `--force` / `--legacy-peer-deps` (ask before installing)

### Schema and codegen

- [x] `schema.graphql` committed at repo root; `npm run codegen:schema` (`scripts/fetch-schema.mts`, introspection → `buildClientSchema` + `printSchema`, no new dep)
- [x] `codegen.ts`: local schema, `src/lib/graphql/documents/**/*.graphql`, client preset, `fragmentMasking: false`, `strictScalars` + scalar map
- [x] `npm run codegen` → `src/lib/graphql/generated/` (committed, never hand-edited)
- [x] `generated/` and `schema.graphql` in `.prettierignore` and ESLint ignores

### Documents

- [x] `fragments.graphql`: `Money`, `Image`, `ProductCard`
- [x] `collection.graphql`: `Collections`, `CollectionByHandle` (`first: 250`, `ProductCard` fragment)

### Apollo clients

- [x] `src/lib/graphql/config.ts`: API URL, headers, `REVALIDATE_SECONDS` (3600), cache tags (plain constants)
- [x] `src/lib/graphql/rsc-client.ts`: `registerApolloClient`, `HttpLink` with `force-cache` + `next: { revalidate, tags }`, `server-only`; per-query `context.fetchOptions` override shown to work
- [x] `src/lib/graphql/ApolloWrapper.tsx`: `"use client"`, `ApolloNextAppProvider`, mounted in `src/app/layout.tsx`
- [x] `ApolloClient` / `InMemoryCache` from the integration package; hooks from `@apollo/client/react`

### Domain layer

- [x] Domain types `CollectionSummary`, `ProductCard`, `Money` derived from generated types
- [x] `src/lib/catalog/mappers.ts`: `toCollectionSummary`, `toProductCard` (incl. `isOnSale`, card price); pure
- [x] Fetchers (`server-only`): `getCollections()`, `getCollection(handle)` → `null` for unknown handle
- [x] GraphQL and network errors are never silently turned into empty data

### First vertical slice

- [x] `src/app/page.tsx` lists the four collection titles via `getCollections()` (unstyled, temporary)
- [x] Dev server: one request per operation, reload served from fetch cache (record method in Notes)

### Tests

- [x] Fixtures in `src/test/msw/fixtures/` from real responses (`Collections`, `CollectionByHandle`, unknown handle), `.ts` with `satisfies <Query>`, capture date in comment
- [x] Mapper tests: happy path, on sale / not on sale, missing image, empty collection
- [x] Fetcher tests (Node env, MSW `graphql.link`): success, unknown handle → `null`, GraphQL error, network error; `server-only` handled
- [x] MSW setup: `src/test/msw/server.ts` + handlers, `onUnhandledRequest: "error"`, reset/close hooks
- [x] Provider smoke test: child renders inside `ApolloWrapper` (browser condition + `resetApolloClientSingletons`)
- [x] Coverage ≥ 80% on `src/lib/**`

### CI

- [x] "Codegen drift check" step after `npm ci`, before Typecheck: `npm run codegen && git diff --exit-code src/lib/graphql/generated`
- [ ] Prove it: temporary commit changing a document without regenerating → red run, then revert → green; both URLs in PR Evidence

## Notes

- **Spec:** `context/features/003-graphql-layer-spec.md`
- **Source of truth:** `docs/apollo-nextjs.md` → Decisions (wins over the spec; if they conflict, stop and ask), Verified facts, Implementation outline, Testing strategy.
- **Verify first (record outcome here; stop and ask if one fails):**
  1. `graphql` 17 installs cleanly with Apollo 4, codegen 7, MSW 2 (else latest 16.x): **OK, `graphql` 17.0.2**, no `--force` / `--legacy-peer-deps`, `npm ls` clean. Installed: `@apollo/client` 4.3.1, `@apollo/client-integration-nextjs` 0.14.5 (exact pin), `rxjs` 7.8.2, `@graphql-codegen/cli` 7.4.2, `@graphql-codegen/client-preset` 6.2.0, `msw` 2.15.0. Caveat: `msw` declares `graphql@^16.13.2` as a regular dependency (not a peer), so npm nests a private `graphql` 16.14.2 under `msw`; everything else dedupes to 17.0.2. Confirmed: typed MSW handlers (`shop.query(CollectionsDocument, …)`) work across that split.
  2. Exact Vitest config for the `browser` export condition: **OK.** Two Vitest projects in `vitest.config.mts`:
     - `client` (jsdom): `resolve.conditions: ["browser", ...defaultClientConditions]` (from `vite`). Applies to externalized deps too; no `server.deps.inline` needed.
     - `server` (node, `*.server.test.ts`): `ssr.resolve.conditions: ["react-server", ...defaultServerConditions]`. Needed because `registerApolloClient` is only exported by the RSC build, and Node tests run in Vite's SSR environment (top-level `resolve.conditions` has no effect there).
     - `server-only` is aliased to an empty stub (`src/test/server-only.ts`); Next.js resolves the real one, so no package install.
  3. Codegen scalar list from the first `strictScalars` run: **OK**, the research list was exact: `Color`, `DateTime`, `Decimal`, `HTML`, `ISO8601DateTime`, `URL`, `UnsignedInt64` → `string`, `JSON` → `unknown`. Schema: 426 types.
- **Decisions made during implementation:**
  - `nonOptionalTypename` + `skipTypeNameForRoot` in `codegen.ts`: Apollo adds `__typename` to every non-root selection and needs it in responses to match fragments (without it, fragment fields come back empty). Types and fixtures now match what Apollo receives.
  - Extra `CollectionSummary` fragment, shared by `Collections` and `CollectionByHandle`.
  - `isOnSale` from price ranges (no variants fetched): `compareAtPriceRange.max > priceRange.min`. Variants without a compare-at price report `0.0`. Checked against all 30 live products: identical to the per-variant rule (7 on sale, all fully discounted). Card shows `priceRange.min`; compare-at is `compareAtPriceRange.min` if above it, else `.max`.
  - Fetchers throw (Apollo's default `errorPolicy: "none"` rejects on GraphQL and network errors) → route `error.tsx`. No typed-result wrapper here; `errors.ts` for mutations comes with the cart.
  - `tsconfig`: `allowImportingTsExtensions` so `scripts/fetch-schema.mts` can import `config.ts` under Node type stripping.
  - `rsc-client.ts` exports `makeRscClient` so the `fetchOptions` default and override are unit-tested (`rsc-client.server.test.ts`).
- **For the cart feature:** a per-query `{ cache: "no-store" }` override is shallow-merged, so `next.revalidate` from the link stays set. Pass `next: { revalidate: 0 }` too, or Next warns about conflicting options.
- **Known noise:** fetcher tests log Apollo's warning that the `query` shortcut is used outside an RSC request. Expected in tests.
- **`next build` needs mock.shop live:** the build prerenders `/` (ISR, revalidate 1h) and fetches collections, so a mock.shop outage fails the build (locally and in CI). This is separate from Decision 5, which only covers codegen and tests (both offline). No change now.
- **Constraints:**
  - RSC and client queries never overlap. Catalog data only via Server Components → domain-type props. Browser Apollo cache is reserved for cart and predictive search.
  - `cacheComponents` stays off; no `"use cache"`.
  - API is POST only (GET → 405): no `useGETForQueries`.
  - Components never import generated GraphQL types directly.
  - Use Context7 for Apollo integration, codegen, MSW, Vitest APIs.
- **Out of scope:** product/search/cart/menu documents and fetchers; styling/tokens; `PreloadQuery` and client queries; Storybook and `msw-storybook-addon`; images and `remotePatterns`.
- **Deferred:** whether `generateMetadata` and the page share one Apollo client per request (`product-page`).
- **README trade-off (for `readme-and-deploy`):** Cache Components not used because Apollo's RSC integration doesn't document `"use cache"` support and `registerApolloClient` relies on per-request scoping. Revisit when it does or when PPR is wanted.
- **Dev-server cache check method:** temporarily set `logging: { fetches: { fullUrl: true, hmrRefreshes: true } }` in `next.config.ts` (reverted), ran `npm run dev`, requested `/` three times. Log: first render `POST https://apparel-outdoor.mock.shop/api 200 (cache skip)`, then `(cache hit)` in 2 ms, so one request per operation and reloads come from the fetch cache. Browser (Playwright): no requests to mock.shop, console clean.

## History

<!-- Completed features, oldest first. One line each: **Name** - summary (PR #n) -->

- **Initial Next.js setup** - Create Next App scaffold (Next.js 16.3.5, React 19.2.8, TypeScript, ESLint) plus project context docs and CLAUDE.md (direct to `main`, no PR)
- **Initial Setup** - Boilerplate removed, SCSS reset, strict TS (`noUncheckedIndexedAccess`), Prettier + editorconfig, Vitest/RTL with coverage, Node 24, MIT license (PR #1)
- **CI Pipeline** - GitHub Actions `ci` job (lint, format, typecheck, coverage ≥ 80% on `src/lib`, build), PR template, Dependabot, README placeholder with CI badge (PR #2)
