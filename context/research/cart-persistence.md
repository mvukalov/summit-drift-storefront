# Cart Persistence & Optimistic Updates Research

## Output

`docs/cart.md`

## Research

How should the cart id persist and how should optimistic updates with rollback work in Next.js 16 App Router with the Storefront API cart?

## Include

- Cookie vs. local storage for the cart id; reading it in Server Components; setting it (Server Action vs. route handler vs. client)
- Avoiding hydration mismatch for the cart count in the header
- Optimistic update options: React `useOptimistic`, Apollo `optimisticResponse`, or a custom reducer — trade-offs and recommendation
- Rollback on network error and on `userErrors` (`INVALID_MERCHANDISE_LINE` is a real code from this API)
- Client-side quantity limits (API accepts any quantity)
- Test plan: unit (reducer), component (drawer), E2E (add → update → remove)

## Sources

- Context7: Next.js 16 (cookies, Server Actions), React 19 (`useOptimistic`), Apollo Client
- Live API cart mutations: `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `cart(id)`
