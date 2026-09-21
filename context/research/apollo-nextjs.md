# Apollo Client + Next.js App Router Research

## Output

`docs/apollo-nextjs.md`

## Research

How do we use Apollo Client with Next.js 16 App Router so that Server Components fetch data for SSR/SEO, and Client Components (cart, search) use a client-side cache — with typed documents from graphql-codegen?

## Include

- The current official integration package and its setup (RSC client + client provider)
- How RSC fetches are cached and revalidated, and how that interacts with Next.js caching
- graphql-codegen setup: client preset, schema from the live endpoint (introspection works), where generated files go, npm script
- How to pass data from RSC to client components without double-fetching
- Recommended folder layout under `src/lib/graphql/`
- Testing: how to mock GraphQL in Vitest/RTL (e.g. MSW)
- Pitfalls with the current versions

## Sources

- Context7: Apollo Client, Apollo Next.js integration, Next.js 16, graphql-codegen
- Live API: `https://apparel-outdoor.mock.shop/api` (header `X-Shopify-Storefront-Access-Token: public`)
- `context/project-overview.md`
