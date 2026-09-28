# Performance: Profiling `/`, the Cache Components Decision, and Lighthouse CI

> Profiling and decisions for `context/features/015-performance-spec.md`. Done on 2026-09-28
> against Next.js 16.3.5, `@apollo/client-integration-nextjs` 0.14.5 (installed) and `@lhci/cli`
> 0.15.1 (npm). No formal `/research` preceded this — the spec's open question was "what does
> profiling actually show," not an unknown API, per the spec's own Notes section.
> **Verified** = seen in a Lighthouse trace, `next build` output, or a Context7 doc query.

## Where this feature starts

Three prior deferrals converge here: `apollo-nextjs.md` decision 2 ("revisit when we want PPR /
static shells"), `cart.md` decision 2 option 2 (named this feature explicitly), and the README's
own "Cache Components would recover it... deferred to the performance phase." The spec's rule was
explicit: profile first, don't reach for a fix by guessing, and decide Cache Components rather
than deferring a fourth time.

## Baseline, re-measured

`cart.md`'s baseline (93 / 3.24 s) predates the search feature (PR #25). Re-measured on the same
method before any change in this feature (Lighthouse 13.5.0, mobile preset, simulated throttling,
local `next start`, warm cache, median of 5):

| Metric      | `cart.md` baseline (2026-09-24) | This feature's "before" (2026-09-28) |
| ----------- | ------------------------------- | ------------------------------------ |
| Performance | 93                              | 88                                   |
| LCP         | 3.24 s                          | 3.8 s                                |
| TBT         | 37 ms                           | 120 ms                               |
| CLS         | 0                               | 0                                    |
| Page weight | —                               | 456 KiB                              |

Search added a real regression, not just a bigger app. That regression, not a fresh unexplained
slowness, turned out to be most of what this feature had to fix.

## Finding 1: the LCP element changed

Confirmed via Lighthouse's `lcp-breakdown-insight` audit against a warm production build: the LCP
element is now the **H1 hero heading** (`"Built for the long climb, worn past the summit."`), not
the collection tile image `cart.md` recorded. This matches the spec's own suspicion — the hero
image was removed in an earlier small fix, and nothing had re-verified the LCP element since.

## Finding 2: render delay is real, and it's main-thread JS, not network

- TTFB: 33 ms. `elementRenderDelay` (unthrottled): 392 ms.
- `mainthread-work-breakdown` (unthrottled): Script Evaluation 533 ms, Other 179 ms,
  Script Parse/Compile 99 ms, Style/Layout 85 ms — total ~0.9 s.
- Lighthouse's mobile simulation applies a 4× CPU slowdown to this main-thread cost when
  computing the throttled LCP. That is what turns ~0.4 s of real render delay into most of a
  3.8 s LCP: the H1 can't paint (through React hydration) until the main thread works through the
  JS that arrived ahead of it.

This is the "materially lower LCP" lever the spec asked to find before touching anything: less
main-thread JS, not different images (44 KB of images was never the problem, confirmed unchanged
from `cart.md`).

## Finding 3: the single largest resource on `/` was `zod`, shipped by accident

`next build`'s chunk output for `/`, cross-referenced against `total-byte-weight`:

| Resource           | Before (gzip) | Contains                                       |
| ------------------ | ------------: | ---------------------------------------------- |
| `3p1wmlicvzhw2.js` |     **90 KB** | `zod` (529 references, `ZodError`)             |
| `1klr-k0mj6-fs.js` |         72 KB | `react-dom`, `useOptimistic`, `Suspense`       |
| `3mg503mcm5au3.js` |         63 KB | `ApolloClient`, `InMemoryCache`, `graphql-tag` |
| `3k_dk5i4kiw_u.js` |         45 KB | `useOptimistic` (cart chunk)                   |
| `33kgp745wn6b1.js` |         12 KB | Apollo wrapper + search                        |

`zod` — bigger than `react-dom` or Apollo Client core — was the single biggest thing shipped to
every page. Traced it: `SearchCombobox.tsx` (`'use client'`, mounted in the global `Header`, so
present on every route including `/`) imported `searchHref` from `src/lib/search/params.ts` and
`DEFAULT_SEARCH_SORT` from `src/lib/search/sort.ts`. Both files defined module-scope zod schemas
(`qSchema`, `pageSchema`, `searchSortSchema`) that run at import time and can't be tree-shaken,
even though the client only ever called the pure URL-builder and read a constant. The RSC-only
parsing (`parseSearchParams`, `parseSearchSortParam`) doesn't belong in a module a client
component imports.

**Fix:** split each file along the client/server line —

- `src/lib/search/sort.ts` — client-safe: constants, types, `toSearchSortVariables`. No zod.
- `src/lib/search/params.ts` — client-safe: `searchHref`, `SearchParams` type. No zod.
- `src/lib/search/parse.ts` (new) — zod-based parsing (`parseSearchParams`,
  `parseSearchSortParam`), imported only by `search/page.tsx` (RSC) and `SearchSortControl.tsx`
  (a `/search`-only client component whose bundle isn't the regression target — see below).

No behavior change; `parse.test.ts`, `params.test.ts` and `sort.test.ts` were split the same way,
same assertions, same count.

## Finding 4: Apollo Client (~75 KB gzip) also loads on every page

`ApolloWrapper` wraps the root layout because `SearchCombobox`'s predictive search needs
`useLazyQuery` live in the browser — this was already known (`apollo-nextjs.md` decision 4:
"`ApolloWrapper` is now load-bearing for predictive search only"), and the spec named it as a
candidate to check. It is not unnecessary in the sense of a bug — the header search box needs it
— but it is real, measured weight (63 KB core + 12 KB wrapper) paid by every visitor whether or
not they ever use search.

**Decision (architect, 2026-09-28): leave this as a documented trade-off, not a fix, in this
feature.** The available mitigation — lazy-hydrating `SearchCombobox` on focus/click instead of
on page load — is a real behavior change to a component with deliberate accessibility work behind
it (WAI-ARIA list-autocomplete pattern, PR #25), not a bundle-config tweak, so it needs its own
scoped change and re-verification (axe, keyboard-before-hydration) rather than riding in on a
profiling fix. Revisit if `/`'s LCP needs to move further than the zod fix alone got it.

## The Cache Components decision

**Not enabled.** Recorded here, not deferred again, per the spec's explicit instruction.

**Re-verified the documented blocker.** `apollo-nextjs.md`'s risk 1 said Apollo's RSC integration
doesn't document `cacheComponents` / `"use cache"` support, and that `registerApolloClient`'s
per-request scoping might not mix with `"use cache"`'s scopes. Three targeted Context7 queries
against `/apollographql/apollo-client-integrations` today (matching the installed 0.14.5 exactly)
— covering `registerApolloClient` + Cache Components, `dynamicIO`/PPR/static-shell compatibility,
and the changelog/known-limitations — turned up zero mentions of `cacheComponents`, `"use cache"`,
or `dynamicIO`. The gap is unchanged since 2026-09-22.

**Why the profiling findings make this an easy call, not just a cautious one.** Cache Components'
mechanism is a static shell with dynamic parts streamed in — it primarily buys back **TTFB**,
which `cart.md` measured at costing ~250 ms for a visitor holding a cart. But Finding 2 shows
TTFB on `/` is 33 ms; the 3.8 s LCP is render-delay-bound, i.e. main-thread JS execution. Cache
Components doesn't reduce the bytes downloaded or the work the main thread does with them — it
changes when the server responds, not how much the client has to parse and run. Enabling it would
spend real risk (an undocumented interaction changing the cart's whole caching model, exactly the
thing `apollo-nextjs.md` decision 4's `no-store` override was built against) on a mechanism that
doesn't address the problem actually measured. The JS-bundle fix (Finding 3) is a bigger,
lower-risk win for the same afternoon.

**When to revisit:** the same two conditions `apollo-nextjs.md` already named — Apollo's
integration documents Cache Components support, or the project wants PPR for a reason beyond `/`'s
LCP (e.g. a route with real TTFB cost). Neither is true today.

## Lighthouse CI

`@lhci/cli` 0.15.1 installed as a dev dependency; `lighthouserc.js` at the repo root;
`npm run lhci` (`lhci autorun`) runs `npm run build && npm run start` against `http://127.0.0.1:3200/`, 5 runs, mobile preset, simulated throttling — the same method as every
measurement in this doc and `cart.md`. New `lighthouse` job in `.github/workflows/ci.yml`,
parallel to `ci`/`e2e`, uploading the HTML/JSON reports as a build artifact (`upload.target:
filesystem`, no external service, consistent with the project's no-secrets stance).

**Budget, and why it isn't the project's aspirational target.** `context/coding-standards.md`
states Performance ≥ 90 and LCP < 2.5 s as the project's targets. `/` has never met the LCP
target — `cart.md` recorded this as a pre-existing gap, and it remains one after this feature's
fix (median 3.2 s). Setting the CI gate at the aspirational numbers would fail every PR from day
one, which is a broken gate, not a real one. The gate is instead set from **this feature's own
measured "after" baseline, with headroom for GitHub Actions runner noise** (these are known to be
slower and more variable than local hardware for Lighthouse's CPU-throttling simulation):

| Assertion                  | Threshold | Measured "after" median                            |
| -------------------------- | --------- | -------------------------------------------------- |
| `categories:performance`   | ≥ 0.85    | 0.93                                               |
| `categories:accessibility` | ≥ 0.95    | (already 0 axe violations, per `e2e/a11y.spec.ts`) |
| `largest-contentful-paint` | ≤ 4000 ms | 3.2 s                                              |
| `cumulative-layout-shift`  | ≤ 0.1     | 0                                                  |

**Fail-first, verified.** Ran `lhci autorun` locally against the fixed build with
`categories:performance` temporarily set to `minScore: 0.999` (an impossible bar): the gate
reported `categories.performance failure for minScore assertion — expected: >=0.999, found: 0.98`
across all 5 runs and exited non-zero (`assert command failed. Exiting with status code 1.`),
proving the gate actually blocks a regression rather than silently passing. Reverted before
committing.

## Measurements: before/after this feature's fix

Lighthouse mobile, simulated throttling, local `next start`, warm cache, median of 5 — same
method as every prior measurement in this project.

| Metric      | Before (2026-09-28, post-search regression) | After (this feature's zod-split fix) |
| ----------- | ------------------------------------------- | ------------------------------------ |
| Performance | 88                                          | **93**                               |
| LCP         | 3.8 s                                       | **3.2 s**                            |
| FCP         | 0.9 s                                       | 0.9 s                                |
| TBT         | 120 ms                                      | **40 ms**                            |
| CLS         | 0                                           | 0                                    |
| Page weight | 456 KiB                                     | **368 KiB**                          |

Reading it honestly: this mostly **restores** the ground search's regression cost, rather than
improving on the historical (`cart.md`) 93 / 3.24 s baseline outright — the after numbers land
close to, and on LCP slightly better than, that older baseline. `< 2.5 s` LCP remains unmet; that
gap now has a Lighthouse CI budget watching it instead of only a README note, and Finding 4
(Apollo/search bundle weight) is the next lever if it needs to move further.

## Sources

- Lighthouse 13.5.0 CLI, run against a local `next start` production build, 2026-09-28 (10 runs:
  5 before, 5 after the zod-split fix; `lcp-breakdown-insight`, `mainthread-work-breakdown`,
  `bootup-time`, `total-byte-weight` audits).
- `next build` chunk output (`.next/static/chunks/`), cross-referenced with `grep` against each
  chunk for library-identifying strings (`ZodError`, `ApolloClient`, `react-dom`, `useOptimistic`).
- Context7 `/apollographql/apollo-client-integrations`, 2026-09-28: three queries (Cache
  Components + `registerApolloClient`; `dynamicIO`/PPR/static-shell; changelog and known
  limitations) — no results mentioning Cache Components.
- Context7 `/googlechrome/lighthouse-ci`: `lighthouserc.js` structure, `assert.assertions` syntax,
  `upload.target: filesystem`, `startServerCommand`/`startServerReadyPattern`.
- `docs/apollo-nextjs.md` (decision 2, risk 1), `docs/cart.md` (decision 2, "Open" section,
  Measurements) — the deferrals this feature closes out.
