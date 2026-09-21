# Complete Action

Everything here requires my approval at the marked steps. Never merge without it.

1. **Gate:** run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. If anything fails, stop and report. Do not continue.
2. Show `git status` and a summary of the changes. **Ask for approval to commit.**
3. Commit with a conventional commit message (no AI attribution). Multiple focused commits are fine.
4. Push the branch: `git push -u origin <branch>`.
5. Open a PR with `gh pr create --base main`:
   - Title: conventional-commit summary of the feature
   - Body: **What**, **Why** (link to the spec file), **How to test**, **Evidence** (screenshots / Lighthouse numbers if relevant), **Trade-offs / follow-ups**
6. Update `context/current-feature.md` on the branch (main is protected, so this must ride along in the same PR):
   - Append to the END of History: `- **<Feature Name>** - <one-line summary> (PR #<n>)`
   - H1 back to `# Current Feature`, Status: Not Started
   - Clear Goals and Notes (keep the placeholder comments)
   - Commit `chore: update feature history for <feature>` and push.
7. Wait for CI: `gh pr checks --watch`. If a check fails, stop, report the failure and fix it on the branch.
8. When CI is green, show the PR URL. **Ask for approval to merge.**
9. Merge: `gh pr merge --squash --delete-branch`.
10. Sync locally: `git checkout main && git pull`, then `git branch -d <branch>` if the local branch still exists.
11. Suggest: summarize the session and `/clear` before the next feature.
