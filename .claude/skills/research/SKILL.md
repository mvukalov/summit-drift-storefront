---
name: research
description: Run a research task from context/research/<name>.md and write the findings as documentation in docs/. Produces documentation only, never code changes.
argument-hint: <research-name>
---

## Task

Execute research task: $ARGUMENTS

### Instructions

1. If no argument is provided, list the files in `context/research/` (except `_research-template.md`) and error: "Usage: /research <name>".
2. Read `context/research/$ARGUMENTS.md`. If it doesn't exist, error: "Research file not found at context/research/$ARGUMENTS.md".
3. The file defines:
   - **Output** — where to write results (default `docs/<name>.md`)
   - **Research** — the question to answer
   - **Include** — what the output must contain
   - **Sources** — where to look
4. Research using:
   - **Context7** for current library documentation. Always prefer it over memory for Next.js, Apollo, Storybook, Playwright, Lighthouse CI and any library version newer than your training data.
   - The codebase (existing patterns, `package.json` versions).
   - The live API at `https://apparel-outdoor.mock.shop/api` (POST, header `X-Shopify-Storefront-Access-Token: public`) when behaviour must be verified. Record what you actually observed.
   - Subagents for broad exploration if needed.
5. Write the output document with:
   - **Recommendation** (one paragraph)
   - **Alternatives and trade-offs**
   - **Implementation outline** for this project (files, steps, code snippets)
   - **Testing strategy**
   - **Risks / open questions**
   - **Sources** (Context7 library IDs, doc URLs, API observations with date)
6. Summarize the findings in chat and list decisions I need to make.

### Rules

- Documentation only. Do NOT modify source code, config or dependencies.
- Do NOT create branches or commits.
- Clearly separate verified facts (docs, API responses) from assumptions.
