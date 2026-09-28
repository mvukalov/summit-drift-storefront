# README & Deploy Spec

## Overview

This is the last feature. It doesn't add product behavior — it closes out the project for anyone reading the repo cold: a reviewer, a recruiter, another developer. Two things are still open: the README's "Planned Improvements" list still names three items that are now done (search, E2E/a11y, performance), and Storybook — the component library this whole project was partly built to showcase — has no public URL. Everything else the README needs (live demo link, architecture notes, trade-offs table, tech stack) is already written and live.

## Requirements

- **Deploy Storybook publicly.** Static build (`npm run build-storybook` or equivalent) hosted somewhere with a stable URL — Chromatic's free tier or GitHub Pages via a CI step are the two standard options for a project already on GitHub Actions; pick one and say why in `docs/` if it's not obvious (Chromatic also gives visual regression review for free, which may be worth having even unused day-to-day — note it as a trade-off if chosen but not fully utilized).
- **Update README `Planned Improvements`.** Remove: search, E2E/Playwright/axe, performance/Lighthouse/Cache Components — all shipped. Add the Storybook link under `Tech Stack` or a new `Component Library` section, not left in "planned."
- **Update README `Trade-offs recorded so far`.** The LCP/render-delay entry is stale — it describes the pre-performance-feature state (3.24s baseline, "deferred to the performance phase"). Replace with the actual outcome: what was fixed (the zod bundle split), the final measured numbers, and the Cache Components decision (not enabled, and why) as a permanent recorded decision, not a deferral.
- **Sweep the rest of the README** for other now-stale forward-references — anything that still says "will," "planned," or "deferred to" for something that shipped in `search`, `e2e-and-a11y`, or `performance`.
- **Add a Storybook badge/link** near the existing CI badge at the top, matching that pattern.
- Confirm `context/features/README.md` (the feature list/status doc, if one exists in that form) reflects all features as shipped — this is a project convention check, not new documentation.

## Expected Behavior

- A first-time visitor to the repo sees an accurate, current README: nothing described as upcoming that has already shipped, and a working Storybook link that shows the actual component library.
- No application code changes; this is a documentation-and-deploy-config feature.

## Technical

- Storybook deploy: whichever CI-based option is chosen, it should run only on `main` (post-merge), not on every PR — this project's other CI jobs (test, e2e, lighthouse) already run per-PR; a fourth heavy job per-PR isn't needed for a static doc deploy. Mirror the deploy pattern Vercel already uses implicitly (auto-deploy on merge to `main`).
- Read the current README in full before editing — several sections reference specific measured numbers (LCP, TBT, page weight) that must match `docs/performance.md`'s final figures exactly, not be re-derived or approximated.
- No new dependencies expected beyond whatever the chosen Storybook host requires (e.g., `chromatic` CLI as a dev dependency if that route is picked — ask before installing, per standing rule).

## UI

Not applicable.

## Testing

- No new application tests. Verify manually (not an automated test) that the deployed Storybook URL loads and shows the current component set before treating this feature as done — a broken deploy link in a portfolio README is worse than no link.
- CI: confirm the new Storybook deploy step doesn't block or slow the existing `ci`/`e2e`/`lighthouse` jobs (should run in parallel or as a separate workflow, not inline in the critical path).

## Out of Scope

- Any application code, component, or behavior change.
- Chromatic visual regression testing as an actual review gate — only relevant if that hosting option is chosen, and even then, wiring it into the PR workflow as a required check is a future decision, not part of this feature.
- Custom domain for Storybook — default host URL is fine for a portfolio piece.

## Notes

- This feature closes the loop `summit-drift-handoff-3.md` and the README's own "Planned Improvements" section left open: search, e2e-and-a11y and performance all shipped since the README was last substantially written.
- No `/research` needed — Storybook static hosting is a well-documented, standard setup with no architectural decision comparable to cart/search; if the chosen host has a genuinely undocumented interaction with this project's setup (monorepo quirks, base-path issues), treat it as a "Verify first" item.
- After this feature merges, the project is feature-complete per `context/features/README.md`. Worth a final end-to-end read-through of the live README against the live demo before calling the portfolio piece done.

## Verify first

1. Confirm the exact final numbers in `docs/performance.md` (Performance score, LCP, TBT, page weight before/after) before copying them into the README trade-offs table — don't re-type from memory of the PR summary.
2. If Chromatic is chosen: confirm its free tier's snapshot limit is workable for a portfolio project with infrequent pushes going forward (not a blocker, just worth knowing before committing to it).
