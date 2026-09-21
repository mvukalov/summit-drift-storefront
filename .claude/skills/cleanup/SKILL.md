---
name: cleanup
description: Find project housekeeping issues (check) or fix selected ones (run). Covers dead code, console logs, stale TODOs, token misuse in SCSS, missing stories and context drift.
argument-hint: check|run
---

Review the codebase for cleanup tasks:

1. History in `context/current-feature.md` is ordered oldest → newest.
2. `console.log` / `debugger` statements in `src/`.
3. Unused imports, variables, exports and files (orphaned components, unused SCSS modules, unused `.graphql` documents).
4. Stale TODO/FIXME comments.
5. `@ts-ignore`, `@ts-expect-error` without explanation, and any `any` types.
6. Hard-coded colors (`#hex`, `rgb(`), pixel spacing or font sizes in `*.module.scss` that should use tokens from `src/styles/tokens.scss`.
7. Inline `style={{…}}` attributes.
8. Plain `<img>` tags instead of `next/image`.
9. Atoms and molecules without a Storybook story; components with logic but no test.
10. Generated GraphQL types out of date (run `npm run codegen` and check for a diff).
11. Context files that no longer match the project (scripts in CLAUDE.md vs `package.json`, folder structure in coding-standards vs `src/`).
12. Dependencies in `package.json` that are not imported anywhere.

**Mode: $ARGUMENTS**

If there is no argument or it is "check":

- Only report findings. Don't modify anything.
- Numbered list, grouped by the categories above, with file paths.

If the argument is "run" or "fix":

- First report all findings as a numbered list.
- Ask: "Which items should I fix? (e.g. 1,3,5 or 'all' or 'none')"
- Wait for my answer before changing anything.
- Fix only the selected items, on the current feature branch (never on `main`).
- Run lint, typecheck and tests afterwards and report what changed.

When a new kind of recurring issue shows up in the project, add it to this list.
