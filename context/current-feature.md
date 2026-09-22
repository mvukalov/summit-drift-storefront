# Current Feature: CI Pipeline

## Status

In Review

## Goals

<!-- Filled by /feature load -->

- [x] `.github/workflows/ci.yml` triggers on `pull_request` → `main` and `push` → `main`
- [x] `concurrency` group per branch/PR with `cancel-in-progress` for PRs (see Notes)
- [x] Least-privilege `permissions: contents: read`
- [x] Single job `ci` on `ubuntu-latest` with named steps: Checkout → Setup Node (from `.nvmrc`, npm cache) → `npm ci` → lint → format:check → typecheck → test:coverage → build
- [x] `NEXT_TELEMETRY_DISABLED=1` in workflow env
- [x] Coverage report uploaded as a workflow artifact (7-day retention)
- [x] Current major versions of `actions/checkout`, `actions/setup-node`, `actions/upload-artifact` (verified from docs)
- [x] Vitest coverage threshold ≥ 80% (lines, functions, branches, statements) on `src/lib/**`; verified it doesn't fail with no matching files, otherwise kept ready but disabled with a note
- [x] `.github/pull_request_template.md` with What, Why (spec link), How to test, Evidence, Trade-offs / follow-ups, plus checklist matching CI (lint, format:check, typecheck, test:coverage, build)
- [x] `.github/dependabot.yml`: `npm` + `github-actions` weekly, npm minor + patch grouped, `build(deps):` / `ci(deps):` prefixes
- [x] README replaced with minimal placeholder: name, one-sentence description, CI badge, note that the full README comes later
- [x] `CLAUDE.md` / `context/ai-interaction.md` updated only where they no longer match (e.g. PRs require green CI)
- [ ] This feature's PR runs green; a deliberate lint-error commit turns CI red on the lint step, then is reverted; both run URLs in the PR Evidence

## Notes

- Spec: [context/features/002-ci-pipeline-spec.md](features/002-ci-pipeline-spec.md)
- Node version comes from `.nvmrc` (Node 24); don't hard-code it in the workflow.
- `npm ci`, not `npm install`. `typecheck` already runs `next typegen` first; keep that.
- Keep job name `ci` stable; it becomes the required status check later.
- Out of scope: Playwright/E2E/axe in CI, Lighthouse CI, Vercel deploy, Storybook builds, branch protection (private repo on free plan; note as a PR follow-up for when the repo goes public).
- `favicon.ico` replacement stays in `new-feature-list.md`.
- Action versions verified via GitHub releases on 2026-09-22: `checkout@v7`, `setup-node@v7`, `upload-artifact@v7`. `cache: npm` is explicit because `package.json` has no `packageManager` field (setup-node's auto-cache needs it).
- Concurrency: `cancel-in-progress` only for `pull_request` events. Runs on `main` are never cancelled, so every merge gets its own completed run and the badge never shows "cancelled". Deviates from the spec's plain `true` by decision in review.
- Coverage threshold is enabled now: an empty `src/lib` passes (exit 0); an untested `src/lib` file fails all four metrics (exit 1).
- Dependabot PRs opened after merge must pass CI before merging; don't merge them blindly.

## History

<!-- Completed features, oldest first. One line each: **Name** - summary (PR #n) -->

- **Initial Next.js setup** - Create Next App scaffold (Next.js 16.3.5, React 19.2.8, TypeScript, ESLint) plus project context docs and CLAUDE.md (direct to `main`, no PR)
- **Initial Setup** - Boilerplate removed, SCSS reset, strict TS (`noUncheckedIndexedAccess`), Prettier + editorconfig, Vitest/RTL with coverage, Node 24, MIT license (PR #1)
