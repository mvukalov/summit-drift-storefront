# Predictive Search & Search Results Research

## Output

`docs/predictive-search.md`

## Research

How should search work in this Next.js 16 App Router storefront: a `/search?q=` results page plus a predictive combobox in the header, against mock.shop's Storefront API?

## Include

- What the API actually supports: `search` vs `predictiveSearch` queries, fields returned, result limits, behaviour on empty/short/unknown queries (probe the live API, don't assume)
- Results page: server-rendered from `?q=`, URL state validated, empty and no-results states, metadata/noindex, pagination or limit
- Predictive combobox: client-driven vs Server Action vs Route Handler; debounce, request cancellation, and stale-response races
- Whether the client Apollo cache (`ApolloWrapper`) is still needed, or the feature can be server-driven; if not, whether the provider can be removed entirely (context: `docs/cart.md` decision 1)
- Accessibility: WAI-ARIA combobox pattern (roles, `aria-activedescendant`, keyboard model, live-region announcement of result count) and how to test it (RTL + axe)
- Test plan: unit (query/param handling), component (combobox behaviour), E2E (type → select → navigate)

## Sources

- Context7: Next.js 16, React 19, Apollo Client
- Live API search queries
- WAI-ARIA Authoring Practices: combobox
- Prior research: `docs/apollo-nextjs.md`, `docs/cart.md`
