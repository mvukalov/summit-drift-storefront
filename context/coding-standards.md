# Coding Standards

## TypeScript

- `strict: true`. No `any`; use `unknown` and narrow.
- GraphQL data types come **only** from codegen output. Map them to domain types (`src/types/`) at the boundary in `src/lib/`.
- Define interfaces for all component props.
- Prefer type inference where obvious, explicit return types on exported functions in `src/lib/`.
- Validate external input (URL search params, env vars) with Zod.

## React

- Functional components only. One job per component.
- Extract reusable stateful logic into custom hooks (`src/hooks/`).
- No `useEffect` for data fetching or for deriving state that can be computed during render.
- Every list item has a stable `key` (handle or id, never the index).
- Memoize (`useMemo`, `useCallback`, `memo`) only when a measured or obvious re-render problem exists.

## Next.js (App Router)

- **Server Components by default.** Use `'use client'` only for interactivity (cart, variant picker, search combobox, facet controls).
- Keep client components small and push them to the leaves of the tree.
- Data is fetched in Server Components through the Apollo RSC client. Client components use the client-side Apollo provider only when they need live data (e.g. cart).
- Every route has `loading.tsx` and `error.tsx`; `not-found` for unknown handles.
- Use `generateMetadata` for SEO on collection and product pages.
- Images always go through `next/image` with explicit `sizes`. Never use a plain `<img>`.

## GraphQL

- Documents live in `src/lib/graphql/documents/*.graphql`. No inline query strings in components.
- Use **fragments** for shared shapes (`ProductCardFragment`, `MoneyFragment`, `CartFragment`).
- Request only the fields the UI uses.
- After changing a document, run `npm run codegen` and commit the generated output.
- Mutations must check `userErrors` as well as network errors.

## Styling (SCSS Modules)

- One `Component.module.scss` per component, next to the component.
- **Only design tokens.** Colors, spacing, font sizes, radii, shadows and z-indexes come from `src/styles/tokens.scss` (CSS custom properties). No hard-coded hex values or pixel spacing in components.
- Breakpoints via shared mixins in `src/styles/_breakpoints.scss`. Mobile first (`min-width` queries).
- No inline styles. No global class names outside `src/styles/globals.scss`.
- Class names in camelCase (`.priceRow`), composed with `clsx` when conditional.
- Respect `prefers-reduced-motion` for all animations.

## Design System (Atomic)

- `src/components/atoms/` — Button, Price, Badge, Swatch, Input, Spinner, VisuallyHidden…
- `src/components/molecules/` — ProductCard, FacetGroup, QuantityStepper, SearchCombobox…
- `src/components/organisms/` — Header, ProductGrid, VariantPicker, CartDrawer…
- Atoms don't import molecules; molecules don't import organisms.
- Every atom and molecule has a Storybook story covering its states (default, hover/focus, disabled, loading, error where relevant).
- **Exception:** a component with no visual output needs no story. `JsonLd` renders a `<script>` tag and nothing else, so a story would be an empty page (established in `context/features/008-collection-page-spec.md`). Such components are still unit-tested.

## Accessibility

- Semantic HTML first; ARIA only when no native element fits.
- Everything works with the keyboard; visible focus styles (`:focus-visible`).
- Touch targets ≥ 44×44 px.
- Color is never the only signal (swatches have text labels; sale has a text badge).
- The search combobox and variant picker follow WAI-ARIA Authoring Practices patterns.

## File Organization

```
src/
  app/                     routes, layouts, loading/error states
  components/atoms|molecules|organisms/ComponentName/
    ComponentName.tsx
    ComponentName.module.scss
    ComponentName.test.tsx
    ComponentName.stories.tsx
  hooks/                   custom hooks
  lib/
    graphql/               documents, generated types, Apollo clients
    catalog/               fetchers + mappers: GraphQL types → domain types
    facets/                derive / apply / URL (de)serialize — pure TS
    cart/                  reducer, optimistic logic, cookie helpers — pure TS
    format/                money, option-name normalization, colors
    sanitize/              allowlist sanitizer for API-supplied HTML — pure TS
    seo/                   canonical URLs, breadcrumbs, structured data
  styles/                  tokens, mixins, breakpoints, globals
  types/                   domain types
e2e/                       Playwright specs
```

## Naming

- Components: PascalCase (`ProductCard.tsx`)
- Hooks: `useSomething.ts`
- Functions and variables: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/interfaces: PascalCase, no `I` prefix
- Test files: `*.test.ts(x)` next to the source; E2E: `e2e/*.spec.ts`

## Error Handling

- Pure functions in `src/lib/` return typed results (`{ ok: true, data } | { ok: false, error }`) instead of throwing, where failure is expected (cart mutations, parsing).
- User-facing errors are short and actionable. No raw error messages or stack traces in the UI.
- Never swallow errors silently. Log in development only.

## Security

- `descriptionHtml` and any other HTML from the API is **sanitized** before rendering. `dangerouslySetInnerHTML` is allowed only with sanitized input, in one dedicated component.
- JSON-LD structured data is rendered by one dedicated `JsonLd` component: `JSON.stringify` output with `<` escaped as `\u003c`, so API text can't close the `<script>` tag.
- Search params are parsed and validated with Zod before use.
- No secrets in client code (this project has none; keep it that way).

## Testing

- **Unit (Vitest):** all logic in `src/lib/` and hooks. Happy path, edge cases and error cases.
- **Component (React Testing Library):** behaviour, not implementation. Query by role and label, interact with `userEvent`.
- **E2E (Playwright):** key user flows (browse → product → add to cart → update → remove; search; facets in URL) plus an axe check on each main page.
- Mock the network at the GraphQL boundary (e.g. MSW) for component tests; E2E runs against the real mock.shop API.
- Don't write tests just to raise coverage. Coverage threshold: ≥ 80% on `src/lib/`.
- Use `vi.useFakeTimers()` for debounce and time-dependent logic.

## Performance

- Budgets (enforced by Lighthouse CI): Performance ≥ 90, Accessibility ≥ 95, LCP < 2.5 s, CLS < 0.1.
- Exactly one image per page, the LCP image, uses `fetchPriority="high"` with `loading="eager"`. Other above-the-fold images may use `loading="eager"` without high priority. `priority` is deprecated in Next 16; don't use it. All images reserve their aspect ratio.
- Avoid large client-side dependencies. Check the bundle impact before adding a library.

## Code Quality

- No commented-out code, unused imports or variables, `console.log` in committed code.
- Functions under ~50 lines where practical.
- No `@ts-ignore`; `@ts-expect-error` only with an explanation.
