# Performance Spec

## Overview

Bring `/` (and, opportunistically, the other routes) under the project's performance budget, add Lighthouse CI so a regression fails the build, and close the Cache Components question that `apollo-nextjs.md` (decision 2), `cart.md` (option 2, deferred) and the README trade-offs have each pushed forward without deciding. The starting fact, already measured: `/` scores Performance 93 with LCP 3.18–3.31s (depending on whether the visitor holds a cart), and **86% of that LCP is render delay, not resource load** — only 44KB of images are involved, so this is a JavaScript/main-thread problem, not an image-optimization one. Don't reach for image tooling as the first move; profile the actual render delay before picking a fix.

## Requirements

- **Profile before optimizing.** Capture a Lighthouse trace (or Chrome DevTools Performance trace) of `/` and identify what's actually filling the 86% render-delay window: main-thread JS execution, hydration cost, a specific component's mount work, or something else. Record the finding — this determines everything below, and guessing wrong wastes the rest of the feature.
- **Decide Cache Components, don't defer it again.** `cacheComponents: true` was named as the fix for `/` losing static prerendering when the cart cookie read was added (`cart.md` decision 2, option 2) and was deferred each time as "not in scope for the cart feature." This feature is the one that either turns it on — with `"use cache"` boundaries around the static shell and the cart/predictive-search reads streamed in — or documents concretely why not (e.g. if Apollo's RSC integration still doesn't document support for it, per `apollo-nextjs.md`'s original caveat — verify this hasn't changed since Apollo 4.3.1).
- **Identify and reduce the client JS actually shipped to `/`.** Candidates to check, not assume: `ApolloWrapper` (needed only for the predictive search combobox — confirm it isn't being pulled into the initial `/` bundle unnecessarily), `CartProvider` (wraps the whole app), any client component on the home page that doesn't need to be one. Use `next build`'s bundle output / `next.config.ts` bundle analyzer to find what's actually large, rather than optimizing by guesswork.
- **Lighthouse CI**: new CI job (or step in the existing `ci` job) running Lighthouse against a production build, with a budget that fails the PR if exceeded. Budget numbers should be set from the *current, measured* baseline plus a realistic target — not an arbitrary round number pulled from nowhere.
- **Before/after measurement**, same method as every prior performance note in this project (Lighthouse mobile, median of 5 runs, same machine): record `/` before this feature's changes and after, in the same table format already used in the README's "Trade-offs" section and `docs/cart.md`.
- Re-verify the LCP element on `/` hasn't changed since the hero image was removed (a prior small fix) — confirm what element Lighthouse currently reports as LCP before optimizing around an assumption.

## Expected Behavior

- `/` (and ideally collection/PDP, though `/` is the only one with a known regression) loads with a materially lower LCP than the 3.18–3.31s baseline, verified by the same measurement method used throughout the project.
- A pull request that regresses performance below the budget fails CI, the same way a failing test or a11y violation already does.
- Whatever the Cache Components decision turns out to be, it's a *decision* recorded in `docs/` — not a deferral to yet another future feature. There is no feature after this one to defer it to.

## Technical

- Read `docs/apollo-nextjs.md` (decision 2, the original Cache Components deferral and its stated revisit conditions) and `docs/cart.md` (decision 2, option 2) before starting — this feature is explicitly the trigger both docs named.
- If Cache Components is enabled: `"use cache"` boundaries need to respect the RSC/SSR non-overlap rule from `apollo-nextjs.md`'s original recommendation (catalog data fetched only in RSC). Test that the cart's `no-store` per-query override (`apollo-nextjs.md` decision 4) still behaves correctly under the new caching model — this is the highest-risk interaction in this feature, since it changes the caching model the cart's whole design assumed.
- If Cache Components is **not** enabled (e.g. still no documented Apollo integration support), the render-delay fix has to come from elsewhere — client bundle reduction, deferring non-critical hydration, or similar — and the spec's profiling step should have already pointed at the real cause.
- Follow the project's existing measurement convention exactly (Lighthouse mobile, median of 5, same machine) so numbers are comparable across every doc that already uses it.

## UI

Not applicable — no visual or interaction changes expected. If a fix requires deferring or lazy-loading a component that currently renders synchronously, confirm there's no visible layout shift or flash introduced (CLS must stay at 0, matching every measurement so far).

## Testing

- Lighthouse CI budget enforcement is itself the primary "test" this feature adds — confirm it actually fails a PR when a deliberate regression is introduced (the same fail-first verification pattern used for the cart and e2e regression tests: prove the gate works before trusting it).
- Existing unit/component/E2E suites must stay green; this feature shouldn't need new application-level tests, only the CI budget step and whatever the profiling investigation turns up as worth asserting (e.g. a bundle-size check, if one is added).
- If Cache Components is enabled, the cart's existing E2E suite (`e2e/cart.spec.ts`, from `e2e-and-a11y`) is the regression check that the caching model change didn't break cart behavior — run it explicitly against the changed build, don't assume it's covered by CI alone until it's been watched pass once.

## Out of Scope

- Any new product feature or UI.
- Image optimization work, unless the profiling step (Requirements, first bullet) actually finds images to be a contributor — the current measurement says they aren't (44KB total).
- Search or cart behavior changes — only the caching model underneath them, if Cache Components is adopted.

## Notes

- This feature is where three prior deferrals converge: `apollo-nextjs.md` decision 2 ("revisit when we want PPR / static shells"), `cart.md` decision 2 option 2 (explicitly named this feature), and the README's own "Cache Components would recover it... deferred to the performance phase" line. Don't defer a fourth time — decide and document.
- No `/research` was run for this spec, consistent with `e2e-and-a11y` — the open question here is a profiling/measurement task, not an unknown API or framework capability. If profiling turns up something that genuinely needs research (e.g. an undocumented Cache Components + Apollo interaction), a short `/research` before the fix is reasonable — flag it rather than guessing.

## Verify first

1. Confirm what Lighthouse currently reports as the LCP element on `/` before optimizing around an assumption (the hero image was removed in an earlier small fix; the LCP element may have changed).
2. Confirm whether Apollo's RSC integration documents Cache Components support now — this was the stated blocker in `apollo-nextjs.md` and may have changed since that doc was written (2026-09-22).
