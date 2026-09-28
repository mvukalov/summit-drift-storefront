# Storybook Deploy: GitHub Pages, and the Base-Path Quirk

> For `context/features/016-readme-and-deploy-spec.md`. No `/research` preceded this per the
> spec's own Notes — the spec called it "a well-documented, standard setup with no architectural
> decision comparable to cart/search." One thing did turn out non-obvious: the base path.

## Host: GitHub Pages, not Chromatic

The spec offered a choice. GitHub Pages was picked because:

- **No new dependency and no secret.** Chromatic needs its CLI as a dev dependency and a project
  token stored as a repo secret. This project's `CLAUDE.md` already states "no secrets, keep it
  that way" for the app itself; a deploy-only token would be the first exception, for a benefit
  (Chromatic's visual regression review) this feature explicitly doesn't wire into the PR
  workflow.
- **The repo is already on GitHub Actions.** Deploying via `actions/deploy-pages` reuses the same
  CI provider as `ci`/`e2e`/`lighthouse` instead of introducing a second one.
- Chromatic's free-tier snapshot limit was the spec's own "verify first" item; moot once GitHub
  Pages was chosen.

## The base-path quirk

A GitHub Pages **project** site (this repo isn't `mvukalov.github.io`) is served from a subpath —
`https://mvukalov.github.io/summit-drift-storefront/`, not the domain root. Storybook's Vite
builder emits asset URLs assuming root (`/assets/...`) unless told otherwise, which 404s once
deployed under a subpath.

Hardcoding `/summit-drift-storefront/` into `.storybook/main.ts` would work but silently break if
the repo is ever renamed. Instead, `actions/configure-pages` (run once per workflow, before the
build) exposes a `base_path` output describing exactly where Pages will serve the site from; the
workflow passes it into the build as `STORYBOOK_BASE_PATH`, and `viteFinal` in
`.storybook/main.ts` applies it to `config.base` — **only** when `configType === "PRODUCTION"`.
Local `npm run storybook` never sets that env var, so the dev server keeps serving from `/` as
before; nothing about local Storybook usage changed.

## CI shape

`storybook.yml` is a separate workflow from `ci.yml`, triggered only on `push: branches: [main]`
(no `pull_request` trigger), so it runs post-merge like Vercel's deploy already does, and never
adds time to the per-PR `ci`/`e2e`/`lighthouse` jobs. `concurrency: { group: pages,
cancel-in-progress: false }` matches GitHub's own guidance for the Pages deploy job — a second
push shouldn't cancel a deployment already in flight, just queue behind it.

## Verified

- `gh api repos/{owner}/{repo}/pages` returned 404 before this feature — Pages was not previously
  enabled on this repo. Enabled via `gh api --method POST .../pages -f build_type=workflow`
  (equivalent to the Settings → Pages → Source → GitHub Actions toggle), confirmed by the same
  endpoint then returning `"build_type":"workflow"` and the eventual `html_url`.
- Action versions (`configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`) checked
  against each action's own latest GitHub release on 2026-09-28, matching the versions already in
  use for `checkout`/`setup-node`/`upload-artifact` (`@v7`) in `ci.yml` — these are their actual
  current majors, not inflated to match.
