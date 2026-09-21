# Start Action

1. Read current-feature.md. If Goals are empty, error: "Run /feature load first".
2. Make sure the working tree is clean. If not, stop and ask.
3. Update `main`: `git checkout main && git pull`.
4. Create and check out the branch, derived from the H1:
   - `feature/<kebab-name>`, or `fix/<kebab-name>` for fixes.
5. Set Status to "In Progress".
6. Present a short implementation plan (files to create/change, order of goals). Wait for my OK if the plan includes new dependencies or architectural decisions not covered by the spec.
7. Implement the goals one by one, following `context/coding-standards.md`. After each goal, run lint and typecheck.
8. When done, list which goals are implemented and what should be checked manually in the browser.
