# CI Pipeline Spec

## Overview

Add GitHub Actions CI so every pull request and every push to `main` runs the same quality gates we run locally: lint, format check, typecheck, tests with coverage, and a production build. From this feature on, a PR is only merged when CI is green. Also add a PR template and Dependabot so the repo looks and behaves like a real team project.

## Requirements

- **Workflow** `.github/workflows/ci.yml`:
  - Triggers: `pull_request` targeting `main`, and `push` to `main`
  - `concurrency` group per branch/PR with `cancel-in-progress: true`
  - Least-privilege `permissions: contents: read`
  - One job named `ci` on `ubuntu-latest` with clearly named steps:
    1. Checkout
    2. Setup Node from `.nvmrc` with npm cache
    3. `npm ci`
    4. `npm run lint`
    5. `npm run format:check`
    6. `npm run typecheck`
    7. `npm run test:coverage`
    8. `npm run build`
  - Upload the coverage report as a workflow artifact (short retention, e.g. 7 days)
  - Use the current major versions of official actions (`actions/checkout`, `actions/setup-node`, `actions/upload-artifact`); check their docs, don't assume versions from memory
- **Coverage threshold**: configure Vitest to enforce ≥ 80% (lines, functions, branches, statements) for `src/lib/**`. `src/lib` is still empty, so first verify the threshold does not fail when no files match. If it does, keep the config ready but disabled with a clear note, and enable it in the `graphql-layer` feature.
- **PR template** `.github/pull_request_template.md` with sections: What, Why (link to spec), How to test, Evidence, Trade-offs / follow-ups, plus a short checklist (lint, typecheck, tests, build pass locally).
- **Dependabot** `.github/dependabot.yml`:
  - `npm` and `github-actions` ecosystems, weekly
  - group minor + patch npm updates into one PR to keep noise low
  - conventional commit prefixes (`build(deps):`, `ci(deps):`)
- **README**: replace the create-next-app README with a minimal placeholder: project name, one-sentence description, CI status badge for this workflow, and a line saying the full README comes in a later feature.
- Update `CLAUDE.md` / `context/ai-interaction.md` only if something in them no longer matches (e.g. mention that PRs require green CI).

## Expected Behavior

- Opening this feature's own PR triggers the workflow, and all steps pass.
- A failing check (e.g. a lint error) makes the `ci` job red and shows which step failed.
- The PR description on GitHub is pre-filled from the template.
- The CI badge on the README shows the status of `main`.

## Technical

- Node version comes from `.nvmrc` (Node 24), so CI and local always match. Don't hard-code the version in the workflow.
- `npm ci`, not `npm install`, so the lockfile is respected.
- `typecheck` already runs `next typegen` first, so it works on a fresh clone. Keep that.
- Next.js telemetry: set `NEXT_TELEMETRY_DISABLED=1` in the workflow env.
- Keep the job name stable (`ci`). It will become the required status check when branch protection is enabled.

## Testing

- The workflow is verified by this PR itself: the run must be green, and the run URL goes in the PR's Evidence section.
- Prove the gate actually fails: on the branch, push a temporary commit with a deliberate lint error, confirm CI goes red on the lint step, then revert it. The squash merge keeps `main` clean. Put both run URLs in the PR description.

## Out of Scope

- Playwright / E2E and axe in CI (added with the `e2e-and-a11y` feature)
- Lighthouse CI (added with the `performance` feature)
- Deployment (Vercel) and Storybook builds
- Branch protection: the repo is private on a free plan, where required status checks aren't available. When the repo goes public, require the `ci` check on `main` (note this in the PR's follow-ups).

## Notes

- `favicon.ico` replacement is tracked in `new-feature-list.md`, not part of this feature.
- If Dependabot opens PRs right after merge, they must also pass CI before merging. Don't merge them blindly.
