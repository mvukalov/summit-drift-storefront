# Load Action

1. Check the argument after "load":
   - Single word (no spaces): look for `context/features/{name}-spec.md`, then `context/features/{name}.md`, then `context/fixes/{name}.md`.
   - Multiple words: treat it as an inline feature description and derive goals from it.
   - Empty: error — "load requires a spec name or a feature description".
2. If `current-feature.md` already has an active feature (Status is In Progress or In Review), stop and ask before overwriting it.
3. Update current-feature.md:
   - H1: `# Current Feature: <Feature Name>`
   - Goals: the spec's requirements as checkable bullets
   - Notes: technical constraints, out-of-scope items, linked research docs
   - Status: Not Started
4. Show a short summary of the loaded feature and any open questions in the spec.
