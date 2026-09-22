# Apollo Client + Next.js 16 App Router

> Research for `context/research/apollo-nextjs.md`. Done on 2026-09-22 against Next.js 16.3.5 (installed) and the versions on npm that day.
> **Verified** = seen in docs, npm or a live API response. **Assumption** = not tested yet; check it during implementation.

## Recommendation

Use the official **`@apollo/client-integration-nextjs`** (0.14.5) with **`@apollo/client` 4.x** (4.3.1). This package replaces `@apollo/experimental-nextjs-app-support`. It gives us two separate clients. Server Components use `registerApolloClient` (one client per request) through `query()`. Client Components use `ApolloNextAppProvider` (one client per SSR request and one in the browser), and its cache is streamed to the browser during SSR. Types come from **graphql-codegen v6** (client preset) reading `.graphql` files in `src/lib/graphql/documents/`, with the schema introspected from mock.shop. The key architectural rule comes from Apollo's docs: **RSC and SSR queries must not overlap.** Catalog data (home, collection, PDP, search results, metadata, JSON-LD) is fetched only in RSC, then mapped to domain types in `src/lib/` and passed to client leaves as plain props. The client-side Apollo cache is used only for data that changes in the browser: the cart and predictive search. `PreloadQuery` is available for the one place a client component needs live server data at first paint (the cart drawer). Keep Next's **previous caching model** (`cacheComponents` off) for now, and cache the POST GraphQL fetches explicitly with `fetchOptions: { cache: 'force-cache', next: { revalidate, tags } }`.

## Decisions

Made by the project architect on 2026-09-22. These replace the matching options under "Alternatives and trade-offs" and any snippet in "Implementation outline" that says otherwise. They are carried into the graphql-layer spec.

1. **Dependencies: approved.** `@apollo/client`, `@apollo/client-integration-nextjs`, `graphql`, `rxjs`, `@graphql-codegen/cli`, `@graphql-codegen/client-preset`, `msw`.
   - `npm install` must succeed **without** `--force` or `--legacy-peer-deps`.
   - If `graphql` 17 causes peer conflicts with codegen or MSW, use the latest `graphql` 16.x instead.
   - Nothing is installed during research. Installation happens in the graphql-layer feature.
2. **Caching: previous model.** `cacheComponents` stays off. The RSC `HttpLink` sets `fetchOptions: { cache: "force-cache", next: { revalidate, tags } }`.
   - Record this as a README trade-off: why Cache Components is not used (Apollo's RSC integration doesn't document support for `"use cache"`, and `registerApolloClient` relies on per-request scoping) and when to revisit it (when the integration documents Cache Components support, or when we want PPR / static shells).
3. **Fragment masking: off** (`presetConfig: { fragmentMasking: false }`). The mapper layer in `src/lib/` already separates components from GraphQL types.
4. **Cart reads in Server Components: one RSC client**, with a per-query override `context: { fetchOptions: { cache: "no-store" } }`.
   - The client must support per-query `fetchOptions`.
   - The concrete cart handling is decided in the cart feature.
5. **Schema: committed `schema.graphql`.** `codegen.ts` reads the local file, so codegen and CI don't depend on mock.shop being up.
   - New npm script `codegen:schema` refreshes the file from the live API. It is run manually.
6. **Generated types: committed.** New CI step:
   `npm run codegen && git diff --exit-code src/lib/graphql/generated`
   CI fails if the generated files are out of date.

## Verified facts

### Packages (npm, 2026-09-22)

| Package                             | Version | Notes                                                                                |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `@apollo/client-integration-nextjs` | 0.14.5  | peers: `@apollo/client ^4`, `next ^15.2.3 \|\| ^16`, `react ^19`, **`rxjs ^7.3.0`**  |
| `@apollo/client`                    | 4.3.1   | React hooks come from **`@apollo/client/react`** in v4, not from the root            |
| `graphql`                           | 17.0.2  | Check that Apollo 4 and codegen accept 17; if a peer conflicts, pin 16.x (see Risks) |
| `@graphql-codegen/cli`              | 7.4.2   |                                                                                      |
| `@graphql-codegen/client-preset`    | 6.2.0   | v6 no longer generates schema object types by default; only operation types          |
| `msw`                               | 2.15.0  | `graphql.link(url)` + `graphql.query(TypedDocumentNode, …)`                          |

### Live API (`https://apparel-outdoor.mock.shop/api`, 2026-09-22)

- **Only POST is allowed.** A GET request returns `405`, and CORS allows `POST, OPTIONS` only. So Apollo's `useGETForQueries` is not an option, and **Next's automatic fetch memoization (GET only) does not apply**.
- CORS is `access-control-allow-origin: *` and allows the headers `content-type` and `x-shopify-storefront-access-token`. The browser can call the API directly, so no proxy route is needed.
- The access token header is **not required** (`{ shop { name } }` works without it). We send it anyway, as the Storefront API contract expects.
- Responses have no cache headers (`cf-cache-status: DYNAMIC`). A small query takes about 0.24 s from here.
- Introspection works: `__schema.types` returns **426** types.
- Unknown handle: `product(handle: "nope")` returns `{"data":{"product":null}}` (no error), so this maps to `notFound()`.
- Invalid field: returns `errors[]` with `extensions.code: "undefinedField"` and no `data`.
- Every response includes `extensions.cost.requestedQueryCost`.

### Apollo integration (Context7 `/apollographql/apollo-client-integrations`)

- `registerApolloClient(makeClient)` returns `{ getClient, query, PreloadQuery }`. It is RSC-only and gives "the same instance … during RSC for an ongoing request, … a new instance for different requests".
- `ApolloNextAppProvider` must live in a `"use client"` file. `ApolloClient` and `InMemoryCache` must be imported **from the integration package**, not from `@apollo/client`. The `uri` must be absolute.
- `HttpLink.fetchOptions` is passed to `fetch`, so Next's `cache`, `next.revalidate` and `next.tags` work there. They can also be overridden per operation with `context: { fetchOptions }`.
- `PreloadQuery` (RSC) fills the client cache. The client then reads the data with `useSuspenseQuery` (same query and variables) or `useReadQuery(queryRef)`. To the client, this looks like a "current network request".
- RSC vs SSR: "queries made in SSR can dynamically update in the browser … queries made in RSC will not" → **avoid overlap**.
- Tests: `resetApolloClientSingletons` in `afterEach`. The SSR build of the provider throws outside the App Router. Tests must resolve the **`browser` export condition**.
- Streaming transport limitation: queries still running when the render finishes are restarted in the browser. Older server data can overwrite newer browser data.
- The docs say nothing about Next 16 `cacheComponents` / `"use cache"`.

### Next.js 16.3.5 caching (bundled docs `node_modules/next/dist/docs/`)

- Two caching models. **Cache Components** (`cacheComponents: true`, uses `"use cache"`, `cacheLife`, `cacheTag`) or the **previous model** (`fetch` options, `unstable_cache`, route segment config).
- Previous model: `fetch` is **not cached by default** ("auto no cache"). `cache: 'force-cache'` caches **including `POST`**. The cache key is URL + method + headers + body, so each GraphQL operation and variables pair gets its own entry. `next.revalidate` and `next.tags` work as usual. Only `200` responses are stored.
- Memoization within one render pass applies to **GET** only.
- `"use cache"` return values must be serializable. The runtime cache is an in-memory LRU and may not persist across serverless instances.

### graphql-codegen (Context7 `/dotansimha/graphql-code-generator`)

- Remote schema with headers: `schema: [{ url: { headers } }]`.
- `preset: 'client'` generates `TypedDocumentNode`s. Options include `fragmentMasking`, `enumsAsTypes`, `useTypeImports`, `strictScalars`, `scalars`, `nonOptionalTypename`, and `avoidOptionals` (renamed in v6).

## How it fits together

```
RSC page / generateMetadata ──query()──▶ per-request ApolloClient ──POST (force-cache, revalidate, tags)──▶ mock.shop
      │  map → domain types (src/lib)
      ▼
  props (plain objects) ──▶ small client leaves (VariantPicker, FacetControls)   ← no Apollo needed

Client islands (cart, search combobox) ──useSuspenseQuery / useMutation──▶ browser ApolloClient ──POST──▶ mock.shop
      ▲
  PreloadQuery (RSC) seeds the cart only where first paint needs it
```

### Passing data from RSC to client components without fetching twice

1. **Default: props.** The RSC fetches the data and maps it to a domain type (`ProductDetail`, `Facet[]`). It passes that to the client component. The client component never imports Apollo, so there is no second request and no cache overlap. This covers the variant picker, facets, gallery and sort.
2. **`PreloadQuery` + `useReadQuery`**: only when the client must **keep the data live in its Apollo cache** afterwards (cart: mutations update the normalized `Cart` entity). The RSC starts the query, then the result streams into the client cache. There is no request from the browser.
3. **Avoid:** fetching the same product in RSC _and_ with `useQuery` on the client (this breaks the no-overlap rule and fetches twice).

Within one RSC request, `generateMetadata` and the page share one client through `getClient()`. Its `InMemoryCache` and in-flight query deduplication should stop a second network call for the same operation. **Assumption:** Next's per-request scoping (React `cache`) covers both `generateMetadata` and the page. Verify this with a request log. If it doesn't, the `force-cache` data cache still serves the second call.

## Alternatives and trade-offs

| Option                                                                    | Pros                                                                                                  | Cons                                                                                      |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A. Apollo integration (RSC + client), props-first** (recommended)       | Matches the tech stack in the project overview; typed; normalized client cache for the cart; official | Two clients to set up; `rxjs` peer; streaming-transport caveats; the package is still 0.x |
| B. Apollo only on the client, plain typed `fetch` in RSC                  | Smallest RSC layer; Next fetch caching is fully transparent                                           | We would write our own RSC fetch/error wrapper; the project overview says Apollo RSC      |
| C. No Apollo: typed `fetch` + codegen everywhere, cart via Server Actions | Smallest bundle; RSC-first; Server Actions + `useOptimistic` fit the cart well                        | Changes the architecture in the project overview; we build the cart cache ourselves       |
| D. urql / graphql-request                                                 | Lighter                                                                                               | Not in the chosen stack; no benefit for this scope                                        |

Caching model:

| Option                                                                | Pros                                                                                          | Cons                                                                                                                                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Previous model + `fetchOptions` on HttpLink** (recommended for now) | Documented by Apollo; per-operation `revalidate`/`tags`; POST caching is explicitly supported | Legacy model in Next 16 terms                                                                                                                                                        |
| Cache Components (`"use cache"` around `query()`)                     | Current Next direction; static shell + PPR                                                    | Apollo docs are silent; `registerApolloClient` uses per-request scoping, which may not mix with `"use cache"` scopes; return values must be serializable (map to domain types first) |

## Implementation outline

### 1. Dependencies (approved)

```
npm i @apollo/client @apollo/client-integration-nextjs graphql rxjs
npm i -D @graphql-codegen/cli @graphql-codegen/client-preset msw
```

### 2. Folder layout

```
src/lib/graphql/
  documents/                 *.graphql  (fragments + operations; one file per domain)
    fragments.graphql        Money, Image, ProductCard, Variant, Cart
    product.graphql          ProductByHandle, ProductRecommendations
    collection.graphql       CollectionByHandle, Collections
    search.graphql           Search, PredictiveSearch
    cart.graphql             Cart, CartCreate, CartLinesAdd/Update/Remove
    menu.graphql             Menu
  generated/                 codegen output (committed, never edited)
  config.ts                  SHOPIFY_API_URL, headers, REVALIDATE_SECONDS, cache tags
  rsc-client.ts              registerApolloClient → { getClient, query, PreloadQuery }
  ApolloWrapper.tsx          "use client" ApolloNextAppProvider
  errors.ts                  map CombinedGraphQLErrors / network / userErrors → typed result
src/lib/catalog/             server-only fetchers: getProduct(handle), getCollection(handle)… → domain types
src/test/msw/                server.ts, handlers.ts, fixtures/
```

### 3. `codegen.ts`

```ts
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema.graphql", // committed; refreshed with `npm run codegen:schema` (Decision 5)
  documents: ["src/lib/graphql/documents/**/*.graphql"],
  ignoreNoDocuments: false,
  generates: {
    "src/lib/graphql/generated/": {
      preset: "client",
      presetConfig: { fragmentMasking: false }, // Decision 3
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        strictScalars: true,
        scalars: {
          Decimal: "string", // API returns "45.0"
          URL: "string",
          HTML: "string",
          DateTime: "string",
          Color: "string",
          JSON: "unknown",
          UnsignedInt64: "string",
          ISO8601DateTime: "string",
        },
      },
    },
  },
};
export default config;
```

Scripts: `"codegen": "graphql-codegen --config codegen.ts"` and `"codegen:schema"`, which writes `schema.graphql` from the live API (Decision 5). How `codegen:schema` is implemented is left to the graphql-layer spec. Add a CI step that runs `codegen` and fails on `git diff --exit-code src/lib/graphql/generated` so generated types can't drift (Decision 6).
**Assumption:** the scalar list must match the schema. `strictScalars` will list any we missed on the first run.

### 4. RSC client — `src/lib/graphql/rsc-client.ts`

```ts
import "server-only";
import { HttpLink } from "@apollo/client";
import {
  registerApolloClient,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { SHOPIFY_API_URL, SHOPIFY_HEADERS, REVALIDATE_SECONDS } from "./config";

export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: SHOPIFY_API_URL,
        headers: SHOPIFY_HEADERS,
        fetchOptions: {
          cache: "force-cache",
          next: { revalidate: REVALIDATE_SECONDS, tags: ["catalog"] },
        },
      }),
    }),
);
```

For per-query tags or opting out: `query({ query: CartDocument, variables, context: { fetchOptions: { cache: "no-store" } } })`. The cart is per user, so it must never use `force-cache`.

### 5. Fetcher in `src/lib/catalog/` (domain boundary)

```ts
import "server-only";
import { query } from "@/lib/graphql/rsc-client";
import { ProductByHandleDocument } from "@/lib/graphql/generated/graphql";
import { toProductDetail } from "./mappers"; // pure, unit-tested
import type { ProductDetail } from "@/types/product";

export async function getProduct(handle: string): Promise<ProductDetail | null> {
  const { data } = await query({ query: ProductByHandleDocument, variables: { handle } });
  return data?.product ? toProductDetail(data.product) : null; // null → notFound()
}
```

Mappers (`toProductDetail`, `toProductCard`) are pure and have no Apollo import, so they are easy to test and count toward the ≥ 80 % `src/lib` coverage.

### 6. Client provider — `src/lib/graphql/ApolloWrapper.tsx`

```tsx
"use client";
import { HttpLink } from "@apollo/client";
import {
  ApolloNextAppProvider,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { SHOPIFY_API_URL, SHOPIFY_HEADERS } from "./config";

function makeClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ uri: SHOPIFY_API_URL, headers: SHOPIFY_HEADERS }),
  });
}

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
```

Mount it in `src/app/layout.tsx` around `children`. Server Components passed as `children` stay server-rendered, so this doesn't make the tree client-side.

### 7. Client usage (Apollo 4 imports)

```tsx
"use client";
import { useMutation, useSuspenseQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
```

Mutations check **both** transport errors (`CombinedGraphQLErrors`, network) **and** `data.cartLinesAdd.userErrors` (e.g. `INVALID_MERCHANDISE_LINE`). Both map to the typed `{ ok, error }` result required by the coding standards.

### 8. Steps

1. Install deps, add `codegen.ts` + script, write fragments and first documents, run `npm run codegen`, commit output.
2. `config.ts`, `rsc-client.ts`, `ApolloWrapper.tsx`, mount in layout.
3. First vertical slice: `getCollections()` on Home → mapper → props. Check in the dev server log that there is one request per operation.
4. Vitest `browser` condition + MSW setup (below).
5. Add a codegen drift check to CI.

## Testing strategy

- **Mappers and error mapping (unit, most of the logic):** pure functions tested with fixtures typed as the generated `ProductByHandleQuery` etc. No network.
- **Client components with Apollo (RTL + MSW):**
  - `src/test/msw/server.ts`: `setupServer(...handlers)`. `listen({ onUnhandledRequest: "error" })`, `resetHandlers()` in `afterEach`, `close()` in `afterAll`.
  - Handlers scoped with `const shop = graphql.link(SHOPIFY_API_URL)`. Use `shop.query(CartDocument, …)` and `shop.mutation(CartLinesAddDocument, …)` so variables and responses are typed from the codegen documents.
  - Error cases: `HttpResponse.json({ errors: [...] })`, `HttpResponse.error()` (network), and `userErrors` payloads for rollback tests.
  - Render inside the real `ApolloWrapper` (or a test `ApolloProvider` with a fresh client) and call `resetApolloClientSingletons` in `afterEach`.
  - Vitest: add `resolve.conditions: ["browser", ...]` so the integration package loads its browser build. Otherwise the provider throws "cannot be used outside of the Next App Router". **Assumption:** confirm the exact Vitest 5 config key during setup.
- **RSC fetchers:** test with MSW in the Node environment (`// @vitest-environment node`). Mock `server-only` with an alias, or keep fetchers thin and cover them in E2E.
- **E2E (Playwright):** against the real mock.shop, as the coding standards require. Assert one call per operation where it matters (e.g. PDP loads without browser-side catalog queries: `page.on("request")` filtered on `/api`).
- **Storybook:** `msw-storybook-addon` can reuse the same handlers later (out of scope here).

## Risks / open questions

1. **`cacheComponents` + Apollo RSC is undocumented.** `registerApolloClient` relies on per-request scoping. Inside `"use cache"` there is no request, so behaviour is unknown. This is why the recommendation keeps the previous model. Revisit if we want PPR.
2. **Decided (see Decisions 1).** **`graphql` 17 peer compatibility** with Apollo 4.3 / codegen 7 / msw 2.15 is **not verified**. If `npm i` reports peer conflicts, use the latest `graphql` 16.x. No `--force` or `--legacy-peer-deps`.
3. **Package is 0.x.** Minor versions may break. Pin exact versions and let Dependabot propose updates.
4. **`rxjs` peer** adds client bundle weight (Apollo 4 is built on it). Measure with `next build` output once the cart is in.
5. **Streaming transport caveats** (older server data can overwrite newer browser data; queries still running are restarted). This is low risk if `PreloadQuery` is used only for the cart.
6. **Decided (see Decisions 4).** **Stale cart via `force-cache`.** The default `fetchOptions` cache everything, so cart queries in RSC **must** pass `cache: "no-store"` per query. One RSC client; the concrete cart handling is decided in the cart feature.
7. **Collection pages read `searchParams`** and are therefore dynamic. `force-cache` still saves the upstream call, but the HTML is rendered per request. This is fine, and the Lighthouse budget will confirm it.
8. **Decided (see Decisions 3): off.** **Fragment masking** is safer but adds `useFragment`/`getFragmentData` boilerplate. With a mapper layer, the domain types already decouple components from GraphQL.
9. **Dedup between `generateMetadata` and page** is assumed, not observed (see above).
10. **Decided (see Decisions 5).** **Codegen needs network access** only when the schema is refreshed. `schema.graphql` is committed and codegen reads it, so CI doesn't depend on mock.shop. Refresh it manually with `npm run codegen:schema`.

## Sources

- Context7 `/apollographql/apollo-client-integrations`: Next.js README (setup, `PreloadQuery`, RSC vs SSR, testing), `registerApolloClient` API, `ApolloNextAppProvider` source, ManualDataTransport drawbacks.
- Context7 `/apollographql/apollo-client`: Apollo Client 4 migration (hooks from `@apollo/client/react`), `CombinedGraphQLErrors`, `useSuspenseQuery` result shape.
- Context7 `/dotansimha/graphql-code-generator`: schema field with headers, client preset config, v6 migration guide.
- Context7 `/mswjs/mswjs.io`: `graphql.link`, `TypedDocumentNode` handlers, Vitest setup, `onUnhandledRequest`.
- `https://github.com/apollographql/apollo-client-integrations/blob/main/packages/nextjs/README.md` (fetched 2026-09-22; no mention of Next 16 / `cacheComponents`).
- Next.js 16.3.5 bundled docs: `01-app/03-api-reference/04-functions/fetch.md`, `01-app/01-getting-started/08-caching.md`, `01-app/02-guides/caching-without-cache-components.md`, `01-app/03-api-reference/01-directives/use-cache.md`.
- npm registry (`npm view`), 2026-09-22: versions and peer dependencies above.
- Live API observations, 2026-09-22: POST query, GET → 405, CORS preflight, request without token, unknown handle, invalid field, introspection type count.
