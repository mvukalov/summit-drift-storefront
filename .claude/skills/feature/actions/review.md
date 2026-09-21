# Review Action

1. Read current-feature.md (goals, notes) and the linked spec.
2. Review all changes: `git diff main`.
3. Report:
   - ✅ Goals met
   - ❌ Goals missing or incomplete
   - ⚠️ Bugs, code quality issues, deviations from `context/coding-standards.md`
   - ♿ Accessibility issues (keyboard, focus, labels, roles)
   - ⚡ Performance issues (unneeded client components, missing `sizes`/`priority`, layout shift, heavy deps)
   - 🔒 Security issues (unsanitized HTML, unvalidated search params)
   - 🧪 Test coverage gaps for new logic and flows
   - 🚫 Scope creep (code beyond the goals)
4. Run lint, typecheck, tests and build, and report the results.
5. Final verdict: **Ready to complete** or **Needs changes** (numbered list).
6. Set Status to "In Review" if ready.
