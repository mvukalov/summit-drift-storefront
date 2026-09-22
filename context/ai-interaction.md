# AI Interaction Guidelines

## Roles

- **I am the architect.** I decide what we build, requirements, architecture, data shapes and when something is done.
- **Claude is the builder.** Claude researches, implements, tests, reviews and runs Git operations within those decisions.
- If a decision is missing, ask. Don't invent architecture.

## Communication

- Be concise and direct.
- Explain non-obvious decisions briefly, including the trade-off.
- For anything bigger than a small change: show the plan first, implement after I approve.
- Ask before large refactors, new dependencies or architectural changes.
- Don't add features that aren't in the current feature's goals.
- Never delete files without asking.

## Workflow (every feature and fix)

1. **Spec** — the feature is described in `context/features/NNN-<name>-spec.md` (or `context/fixes/`); see `context/features/README.md` for naming. The spec stays uncommitted until the branch exists.
2. **Load** — `/feature load <name>` fills `context/current-feature.md`.
3. **Branch** — `/feature start` creates `feature/<name>` or `fix/<name>` from an up-to-date `main` and commits the spec as the first commit on that branch (`docs: add <name> spec`).
4. **Implement** — goal by goal, following the coding standards.
5. **Verify manually** — in the browser (Playwright MCP when useful).
6. **Test** — `/feature test`: unit, component and E2E tests where there is logic worth testing.
7. **Review** — `/feature review`: goals vs. `git diff main`, quality, scope creep, test coverage.
8. **Iterate** — fix what the review found, re-run the checks.
9. **Complete** — `/feature complete`: commit, push, open a PR, wait for green CI, merge after my approval, clean up.
10. **Reset context** — summarize, then `/clear` before the next feature.

## Git

- Branch per feature or fix: `feature/<kebab-name>`, `fix/<kebab-name>`.
- Conventional commits: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`, `ci:`, `perf:`, `style:`, `build:` (dependency updates, e.g. Dependabot).
- Small, focused commits on the branch are fine; PRs are **squash-merged** so `main` gets one commit per feature.
- **Ask before committing.** Never commit until lint, typecheck, tests and build pass.
- Never push directly to `main`. Everything goes through a PR, including specs and docs (`main` is protected).
- Never force-push to `main`. Never rewrite published history without asking.
- No Claude or AI attribution in commit messages or PR descriptions.

## Pull Requests

- Title: the conventional-commit style summary of the feature.
- Description:
  - **What** changed (short list)
  - **Why** (link to the spec file)
  - **How to test** (steps)
  - **Evidence**: screenshots for UI changes, Lighthouse numbers for performance work
  - **Trade-offs / follow-ups**, if any
- Merge only when CI is green **and** I approve.

## When Stuck

- After 2–3 failed attempts, stop.
- Explain: what the problem is, what you tried, why it didn't work, and what decision you need from me.
- Don't try random fixes.
- If docs may be outdated in your memory, check Context7 before guessing.

## Code Changes

- Make the minimal change that achieves the goal.
- Don't refactor unrelated code unless asked.
- Don't add "nice to have" features. Put ideas in `context/new-feature-list.md` instead.
- Preserve existing patterns. Consistency beats personal preference.

## Code Review Focus

Review AI-generated code for:

- **Security:** sanitized HTML, validated search params, no leaked internals in error messages
- **Performance:** unnecessary client components, re-renders, bundle size, image sizing, layout shift
- **Accessibility:** keyboard, focus, labels, roles, contrast
- **Logic:** edge cases (empty collection, one variant, all facets active, failed mutation)
- **Patterns:** matches the coding standards and existing code

## Context Management

- One feature per session. When done: update `current-feature.md` history, then `/clear`.
- Check `/context` regularly and don't let auto-compact trigger mid-task.
- Subagents (`code-scanner`, `ui-reviewer`, `refactor-scanner`) are for larger audits. Verify every finding before acting on it.
