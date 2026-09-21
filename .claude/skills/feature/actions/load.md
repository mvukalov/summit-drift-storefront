# Load Action

1. Check the argument after "load":
   - Single word (no spaces): the name may be given with or without the `NNN-` number prefix. Look for `context/features/NNN-{name}-spec.md` (glob `context/features/[0-9][0-9][0-9]-{name}-spec.md`, or `{name}-spec.md` if the prefix was given), then `context/fixes/NNN-{name}-spec.md`. If more than one file matches, list them and ask which one.
   - Multiple words: treat it as an inline feature description and derive goals from it.
   - Empty: error — "load requires a spec name or a feature description".
2. If `current-feature.md` already has an active feature (Status is In Progress or In Review), stop and ask before overwriting it.
3. Update current-feature.md:
   - H1: `# Current Feature: <Feature Name>`
   - Goals: the spec's requirements as checkable bullets
   - Notes: technical constraints, out-of-scope items, linked research docs
   - Status: Not Started
4. Show a short summary of the loaded feature and any open questions in the spec.
