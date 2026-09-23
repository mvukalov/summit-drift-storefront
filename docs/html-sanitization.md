# HTML Sanitization for `descriptionHtml`

> Research for `context/research/html-sanitization.md`. Done on 2026-09-23 against the installed stack (Next.js 16.3.5, React 19.2.8, Vitest 5.0.1, Node 24.19.0) and the versions on npm that day.
> **Verified** = seen in docs, npm, a live API response, or run locally in a scratch directory. **Assumption** = not tested yet; check it during implementation.
> Nothing was installed into the project. All measurements were made in a throwaway directory outside the repo.

## Recommendation

Use **`sanitize-html` 2.17.7** (+ `@types/sanitize-html` 2.16.1 as a dev dependency) behind a pure function in **`src/lib/sanitize/`**, rendered by exactly one atom, **`src/components/atoms/RichText/`**, which is the only component in the app allowed to call `dangerouslySetInnerHTML` for API content (`JsonLd` remains the only other, for structured data). `sanitize-html` parses with `htmlparser2` and needs no DOM, so it runs unchanged in a Server Component, in Vitest's `node` project and in Vitest's `jsdom` project — all three verified below. The alternative most people reach for, DOMPurify, **requires a DOM and silently degrades to a non-functional stub in a Server Component** (verified: `DOMPurify.isSupported === false`, `DOMPurify.sanitize` is not a function in bare Node); making it work means shipping `jsdom` as a _production_ dependency, which measured **28 MB / 33 packages** against **4.1 MB / 17 packages** for `sanitize-html`. Client bundle impact is **zero** either way, because the sanitizer is only ever imported by a Server Component — but the server bundle and the Docker image pay the difference. The allowlist is **`p`, `ul`, `li` and nothing else** — exactly the tags the live catalog returns (verified across all 30 products and all 4 collections) — with **no attributes at all**. Anything outside the list is dropped while its text is kept, so richer copy from a real Shopify store degrades to readable prose rather than disappearing.

## Decisions

Made by the project architect on 2026-09-23. These replace the matching options under "Alternatives and trade-offs" and any snippet that says otherwise. They are carried into the product-page spec.

1. **Render sanitized `descriptionHtml`**, not the plain-text `description`.
2. **Narrow allowlist: `p`, `ul`, `li` only**, matching the real data. No attributes.
   - This also **closes the one unverified item** in the first draft: `<a>` is not allowed, so the `transformTags` block injecting `rel`/`target` is gone and with it the question of whether transformed attributes survive the allowlist re-check.
   - **Plus `transformTags: { ol: "ul" }`** — see "`ol` → `ul`" below. Cheap insurance for future data; does not widen the allowlist.
3. **Sanitization lives only in the `RichText` component.** No branded `SanitizedHtml` type, no sanitizing in the mapper. The domain type carries the raw API string; `RichText` takes raw HTML and sanitizes it itself, so there is no way to render the value unsanitized.
   - Follow-up: project overview §7 says `descriptionHtml (sanitized)`. That wording should change to reflect sanitize-at-render.
4. **`RichText` is an atom**, not a `ProductDescription` molecule — collections have `descriptionHtml` too (verified), and the collection page will reuse it.
5. **CSP header is out of scope** for this feature → added to `context/new-feature-list.md`.
6. **Dependencies approved:** `sanitize-html@2.17.7` (prod), `@types/sanitize-html@2.16.1` (dev). Pin exact versions. Nothing was installed during research.
7. **ESLint guards: both** (risk 3), as already specified in `context/features/011-product-page-spec.md` § Technical → Sanitization:
   - `no-restricted-imports` blocking `sanitize-html` from anywhere outside `src/lib/sanitize/`;
   - `react/no-danger` on project-wide, allowed only at the `RichText` atom's own `dangerouslySetInnerHTML` line via a **scoped inline disable comment** — not a file-level blanket disable. `JsonLd` needs the same scoped comment at its existing `dangerouslySetInnerHTML`.

### `ol` → `ul`

Re-measuring with the narrow allowlist surfaced a problem the wide allowlist hid. With `ol` disallowed and `disallowedTagsMode: "discard"`, the wrapper is dropped but its children are kept:

```
<ol><li>a</li><li>b</li></ol>   →   <li>a</li><li>b</li>
```

Those are **orphan `<li>` elements with no list parent** — invalid HTML, no list semantics for a screen reader, and axe-core's `listitem` rule ("`<li>` elements must be contained in a `<ul>` or `<ol>`") is **serious** impact, against a project gate of zero serious/critical violations.

One line in the options object fixes it without widening the allowlist — `transformTags: { ol: "ul" }` (verified; attributes are still filtered afterwards, so `<ol onclick="alert(1)">` → `<ul>`):

<!-- prettier-ignore -->
```text
<ol><li>a</li><li>b</li></ol>   →   <ul><li>a</li><li>b</li></ul>
```

The trade-off is honest but small: an ordered list renders with bullets instead of numbers. **Approved** — it keeps the allowlist at exactly three tags and turns a potential a11y failure into a cosmetic one. Latent rather than live: no description in the catalog contains an `<ol>` today (verified), so this is insurance against the data changing or `RichText` being reused for other API HTML.

---

## Verified facts

### 1. What the live API actually returns

Fetched `descriptionHtml` for **all 30 products** and **all 4 collections** from `https://apparel-outdoor.mock.shop/api` on 2026-09-23.

| Observation                  | Result                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Products with a description  | 30 / 30 — **none empty or null**                                              |
| Distinct tags used           | **`<p>` (60), `<ul>` (32), `<li>` (96)** — nothing else                       |
| Attributes on any tag        | **zero**                                                                      |
| HTML entities in the text    | **zero** (`&amp;`, `&lt;` etc. never appear)                                  |
| Non-ASCII characters         | `’` (U+2019 right single quote), `—` (U+2014 em dash) — raw, not escaped      |
| Longest `descriptionHtml`    | **453 characters**                                                            |
| Distinct document shapes     | **2**: `<p>…</p><ul><li>…</li>×3</ul>` (26 products) and `<p>…</p>` alone (4) |
| Collection `descriptionHtml` | a single `<p>…</p>` for all 4 collections                                     |

Two consequences:

- **Sanitization cost is irrelevant here.** 453 characters through `htmlparser2` is microseconds, on the server, once per request. Do not optimize it, and do not memoize it.
- **Collections have `descriptionHtml` too.** The component should not be named `ProductDescription`; it will be reused on `/collections/[handle]`. Hence `RichText`.

Sample (`waterproof-wading-jacket-with-breathable-shell`), verbatim — the API returns it with no whitespace between tags:

<!-- prettier-ignore -->
```text
<p>Early mornings on the river call for a jacket that blocks out the damp without weighing you down. This technical shell keeps you dry and moving freely, no matter how the weather turns.</p><ul><li>Advanced waterproof membrane shields against steady rain and spray</li><li>Strategically placed ventilation panels prevent overheating on active treks</li><li>Articulated sleeves and adjustable cuffs support complete casting mobility</li></ul>
```

> The data is clean **today**. The threat model is not "mock.shop is malicious" — it is "this code is a portfolio artefact that demonstrates you do not pipe third-party HTML into `dangerouslySetInnerHTML` on trust." Sanitize unconditionally regardless of how tame the sample is.

### 2. DOMPurify does not work in a Server Component

Ran in bare Node 24.19.0, no DOM:

```js
import DOMPurify from "dompurify"; // 3.4.16
DOMPurify.isSupported; // => false
DOMPurify.sanitize("<p>a</p><script>alert(1)</script>");
// => TypeError: DOMPurify.sanitize is not a function
```

**This is the single most important finding.** The import succeeds. There is no build error, no type error (`dompurify` ships its own types), and no warning. The failure happens at call time, inside an `async` Server Component, where it surfaces as a generic 500 in production. A slightly different arrangement — wrapping the call in a `try`/`catch` that falls back to the input — would ship raw HTML to the browser. Do not reach for DOMPurify on the server without a DOM.

To use DOMPurify server-side you must supply a DOM:

- `isomorphic-dompurify` 4.3.0 → depends on `jsdom ^30` + `dompurify`. Measured install: **28 MB, 33 packages**.
- `dompurify` + `happy-dom` → `happy-dom` alone is 8.6 MB unpacked.
- `dompurify` + `linkedom` → 0.9 MB unpacked, but `linkedom` is a partial DOM and is not the configuration DOMPurify's security team tests against. **Assumption:** this combination is not audited; I would not use it for a security boundary.

Note that `jsdom` is already in `devDependencies` (Vitest). Adding `isomorphic-dompurify` would promote it to a **production** dependency, shipped in the Docker image and loaded in the serverless function.

### 3. `sanitize-html` footprint

| Package                | Version | Deps (direct)     | Measured install         | Types                       | License |
| ---------------------- | ------- | ----------------- | ------------------------ | --------------------------- | ------- |
| `sanitize-html`        | 2.17.7  | 7                 | **4.1 MB / 17 packages** | **none bundled** → `@types` | MIT     |
| `@types/sanitize-html` | 2.16.1  | 1 (`htmlparser2`) | dev only                 | —                           | MIT     |

Verified details:

- **No bundled types.** `package.json` has no `types`/`typings`/`exports` field. `@types/sanitize-html` is required, and goes in `devDependencies`.
- **CommonJS.** `"type"` is absent, `main: index.js`. `import sanitizeHtml from "sanitize-html"` works through Next's and Vite's interop — verified by running it under both Node ESM and Vitest.
- **`postcss` is a static `require`** at `index.js:6` (`const { parse: postcssParse } = require('postcss')`). Setting `parseStyleAttributes: false` disables _use_ of PostCSS but does **not** remove it from the bundle. Largest transitive packages measured: `dayjs` 1.9 MB (pulled in via `launder`), `entities` 460 KB, `postcss` 344 KB, `htmlparser2` 300 KB.
- **Client bundle impact: none**, provided the sanitizer is imported only from Server Components. Next.js does not include a Server-Component-only module graph in the client bundle. **Guard:** if a `'use client'` file ever imports `RichText`, `sanitize-html` and its 17 packages land in the browser bundle. See "Risks" for how to prevent this.

### 4. `sanitize-html` runs under this repo's Vitest setup

`vitest.config.ts` defines two projects. The `client` project uses `environment: "jsdom"` **and** `resolve.conditions: ["browser", ...defaultClientConditions]`. `postcss` ships a `browser` field that stubs out `path`, `url`, `fs` and `source-map-js`, so there was a real risk the `browser` condition would break the import.

I ran the repo's own `vitest` 5.0.1 binary against a scratch config replicating that project exactly (jsdom + `browser` conditions):

```
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

**Verified: `sanitize-html` imports and sanitizes correctly under jsdom with the `browser` resolve condition.** The component test (`RichText.test.tsx`, jsdom) and the unit test (`sanitize.test.ts`, also jsdom via the `client` project) will both work without touching `vitest.config.ts`. No `server-only` marker on the sanitizer module, and no `.server.test.ts` naming needed.

### 5. Behaviour against malicious input — measured

Re-run on 2026-09-23 with the **final narrow options** (Decision 2 — `allowedTags: ["p","ul","li"]`, `allowedAttributes: {}`). Input → output, verbatim:

| Case                   | Input                                                           | Output                                 |
| ---------------------- | --------------------------------------------------------------- | -------------------------------------- |
| Script tag             | `<p>ok</p><script>alert(1)</script>`                            | `<p>ok</p>`                            |
| Script alone           | `<script>alert("xss")</script>`                                 | `` (empty)                             |
| Inline event handler   | `<p onclick="alert(1)">click</p>`                               | `<p>click</p>`                         |
| `img onerror`          | `<img src=x onerror=alert(1)>`                                  | `` (empty)                             |
| `javascript:` href     | `<a href="javascript:alert(1)">x</a>`                           | `x` — **element gone, text kept**      |
| Link with `target`     | `<a href="https://example.com" target="_blank">link</a>`        | `link` — **element gone**              |
| `style` attribute      | `<p style="background:url(javascript:alert(1))">x</p>`          | `<p>x</p>`                             |
| `class` / `id`         | `<p class="x" id="y">text</p>`                                  | `<p>text</p>`                          |
| `<style>` tag          | `<style>body{display:none}</style><p>after</p>`                 | `<p>after</p>`                         |
| `<iframe>`             | `<iframe src="https://evil.com"></iframe>`                      | `` (empty)                             |
| SVG `onload`           | `<svg onload=alert(1)></svg>`                                   | `` (empty)                             |
| Form + input           | `<form action="/x"><input name="a"></form>`                     | `` (empty)                             |
| Unclosed script        | `<p>hello<script>alert(1)`                                      | `<p>hello</p>`                         |
| mXSS via `<noscript>`  | `<noscript><p title="</noscript><img src=x onerror=alert(1)>">` | `` (empty)                             |
| Disallowed wrapper     | `<div><p>kept</p></div>`                                        | `<p>kept</p>`                          |
| Inline formatting      | `<p>Very <strong>bold</strong> and <em>italic</em></p>`         | `<p>Very bold and italic</p>`          |
| Heading                | `<h2>Title</h2><p>body</p>`                                     | `Title<p>body</p>`                     |
| **Ordered list**       | `<ol><li>a</li><li>b</li></ol>`                                 | **`<li>a</li><li>b</li>` — see below** |
| Real product HTML      | `<p>Early mornings.</p><ul><li>One</li><li>Two</li></ul>`       | unchanged                              |
| Real collection HTML   | `<p>Weatherproof gear featuring an earthy muted palette.</p>`   | unchanged                              |
| Pre-escaped entities   | `<p>5 &lt; 10 &amp; rising</p>`                                 | unchanged (no double-escape)           |
| Smart quotes / em dash | `<p>city’s moods — yes</p>`                                     | unchanged                              |
| Empty string           | `` (empty)                                                      | `` (empty)                             |
| Plain text, no tags    | `no tags at all`                                                | `no tags at all`                       |

Three behaviours worth knowing before you write assertions:

1. **`disallowedTagsMode: "discard"` keeps the text of a disallowed tag** (`<div><p>kept</p></div>` → `<p>kept</p>`), except for the tags listed in `nonTextTags`, whose contents are dropped entirely. That is why `script`, `style`, `iframe`, `noscript`, `object`, `embed` and `template` must be in `nonTextTags` — otherwise `<script>alert(1)</script>` would render the literal text `alert(1)` on the page. Ugly, not dangerous, but wrong.
2. **Under the narrow allowlist, `<a>` disappears entirely and its text survives** (`<a href="…">link</a>` → `link`). This is different from the wide allowlist, which left an inert `<a>` behind. Assert that the output contains no `<a>` at all.
3. **`<ol>` degrades into orphan `<li>` elements.** This is the one sharp edge of the narrow allowlist — invalid HTML and a serious axe violation. See "Open: `ol` → `ul`" under Decisions; `transformTags: { ol: "ul" }` fixes it in one line (verified, attributes still filtered).
   - Same shape, lower priority: a **nested** `<ol>` inside an `<ol>` transforms to `<ul>` directly inside `<ul>` rather than inside an `<li>`, which axe also flags. Not present in the catalog and not worth handling.

### 6. Alternatives measured

| Option                                                                    | Server-safe?             | Measured install      | Verdict                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`sanitize-html` 2.17.7**                                                | ✅ no DOM needed         | 4.1 MB / 17 pkgs      | **Recommended.** Purpose-built, allowlist-first, one function call, string in / string out.                                                                                                                                                                                                                             |
| `isomorphic-dompurify` 4.3.0                                              | ✅ (bundles `jsdom`)     | **28 MB / 33 pkgs**   | DOMPurify is the better-audited sanitizer, but 28 MB of production dependency and a full DOM per call to sanitize 453 characters is the wrong trade here.                                                                                                                                                               |
| `dompurify` 3.4.16 alone                                                  | ❌ **silently unusable** | 1.6 MB                | See §2. Do not use server-side without a DOM.                                                                                                                                                                                                                                                                           |
| `rehype-sanitize` 6.0.0 (+ `unified`, `rehype-parse`, `rehype-stringify`) | ✅                       | 4.6 MB / 46 pkgs      | Same weight, three times the packages, and a whole unified pipeline to configure. Worth it only if we were already rendering Markdown. We are not.                                                                                                                                                                      |
| `xss` 1.0.15                                                              | ✅                       | 145 KB unpacked       | Smallest real option. Less widely deployed than the other two; escapes rather than drops by default. Viable fallback if dependency weight becomes a hard constraint.                                                                                                                                                    |
| **Render `description` (plain text) instead**                             | ✅                       | **zero dependencies** | The API also returns a plain-text `description`. Rendering that as text is unconditionally safe and free. **It loses the bullet list** — the three feature bullets are the most useful part of the copy, and dropping them also drops the sanitization story from the project. Listed for completeness; see Decision 1. |
| Hand-rolled tag stripping (regex)                                         | —                        | —                     | **Never.** Every case in the §5 table is a way regex sanitizers have been broken. Not an option.                                                                                                                                                                                                                        |
| `Element.setHTML()` (HTML Sanitizer API)                                  | ❌                       | —                     | Browser-only. No Node implementation, so unavailable in RSC. Revisit in a few years.                                                                                                                                                                                                                                    |

---

## Implementation outline

### 1. Dependencies

```
npm i sanitize-html@2.17.7
npm i -D @types/sanitize-html@2.16.1
```

Pin exact versions (project convention); Dependabot proposes updates.

### 2. `src/lib/sanitize/rich-text.ts` — the pure function

Pure TypeScript, no React import, so it is unit-tested and counts toward the ≥ 80 % `src/lib/**` coverage threshold.

```ts
import sanitizeHtml from "sanitize-html";

/**
 * Exactly the tags the Storefront API returns for `descriptionHtml`, verified across all
 * 30 products and all 4 collections on 2026-09-23. Anything else is dropped while its
 * text is kept, so richer copy from a real store degrades to readable prose.
 */
const ALLOWED_TAGS = ["p", "ul", "li"] as const;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  // The API sends no attributes at all. Nothing is allowed through — not `class`,
  // `id`, `style` or `href`, which also means no URL scheme can reach the DOM.
  allowedAttributes: {},
  // Drop the tag, keep its text…
  disallowedTagsMode: "discard",
  // …except for these, where the content is markup or code and must go too.
  nonTextTags: [
    "script",
    "style",
    "textarea",
    "option",
    "noscript",
    "iframe",
    "object",
    "embed",
    "template",
  ],
  // No attribute survives, so `style` never reaches PostCSS. Skip the parse.
  parseStyleAttributes: false,
  // Keeps `<ol>` from degrading into orphan `<li>` elements (invalid HTML, serious
  // axe violation). Bullets instead of numbers is the accepted trade-off.
  transformTags: { ol: "ul" },
};

/** Strips everything outside the allowlist from API-supplied HTML. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
```

Notes on the snippet:

- With `allowedAttributes: {}` there is **no URL-scheme surface at all** — no `href`, `src` or `action` survives — so `allowedSchemes` and `allowProtocolRelative` are unnecessary. They were in the first draft only because `<a>` was allowed.
- `parseStyleAttributes: false` **throws** if `allowedStyles` is also set. Don't set `allowedStyles`.
- `transformTags: { ol: "ul" }` uses the documented plain-string shorthand for `simpleTransform`. Verified: attributes are still filtered afterwards, so `<ol onclick="alert(1)">` → `<ul>`.
- Do **not** add `server-only` to this module — it is imported by the jsdom component test.

### 3. `src/components/atoms/RichText/RichText.tsx` — the only escape hatch

```tsx
import { sanitizeRichText } from "@/lib/sanitize/rich-text";
import styles from "./RichText.module.scss";

export interface RichTextProps {
  /** Raw `descriptionHtml` from the Storefront API. Sanitized here, never by the caller. */
  html: string;
  /** Rendered element. `div` by default. */
  as?: "div" | "section";
}

/**
 * The one place API-supplied HTML is written into the DOM. Callers pass raw
 * `descriptionHtml`; sanitization happens here so there is no way to render this
 * content without it (coding standards §Security). `JsonLd` is the only other
 * component allowed to use `dangerouslySetInnerHTML`, and it handles JSON, not markup.
 */
export function RichText({ html, as: Tag = "div" }: RichTextProps) {
  const clean = sanitizeRichText(html);
  if (!clean) return null;

  return (
    <Tag
      className={styles.richText}
      // Sanitized on the line above. This is the sole escape hatch for API markup.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
```

The important property: **the component takes raw HTML, not sanitized HTML.** If it took a pre-sanitized string, every call site would become a place to get it wrong. Sanitizing twice is idempotent and costs nothing at 453 characters.

### 4. `RichText.module.scss`

`dangerouslySetInnerHTML` content cannot carry CSS Modules class names, so style the children by element from the wrapper — the one place descendant selectors are justified. Tokens only, per the standards:

```scss
.richText {
  color: var(--color-text);

  p {
    margin-block-end: var(--space-4);
  }
  ul {
    margin-block-end: var(--space-4);
    padding-inline-start: var(--space-5);
  }
  li {
    margin-block-end: var(--space-2);
  }
  > :last-child {
    margin-block-end: 0;
  }
}
```

Only `p`, `ul` and `li` can reach the DOM, so those are the only selectors needed.

(Token names above are illustrative — check the real ones in `src/styles/tokens.scss` when implementing.)

### 5. Call sites

- `/products/[handle]` — `<RichText html={product.descriptionHtml} />`
- `/collections/[handle]` — same component for the collection description (single `<p>`)
- **JSON-LD `description` uses the plain-text `description` field, not `descriptionHtml`** — schema.org wants text, and `JsonLd` already escapes `<`. No sanitizer involved.

### 6. Domain type

`src/types/catalog.ts` gains `descriptionHtml: string` on `ProductDetail`, carrying the **raw** API value. The project overview §7 currently says `descriptionHtml (sanitized)` — that wording should change to reflect sanitize-at-render (see Decision 3).

---

## Testing strategy

### Unit — `src/lib/sanitize/rich-text.test.ts` (Vitest, `client` project, jsdom)

Table-driven over the cases in §5. Roughly 24 assertions, covering:

- **Attacks:** `<script>` (with and without a closing tag), inline `on*` handlers, `<img onerror>`, `javascript:` and `data:` hrefs, `style` attributes and `<style>` tags, `<iframe>`, `<svg onload>`, `<form>`/`<input>`, and the `<noscript>` mXSS payload.
- **Preservation:** the two real product shapes and the collection shape from the live API pass through byte-identical; pre-escaped entities are not double-escaped; U+2019 and U+2014 survive.
- **Allowlist edges:** `class`/`id` stripped from an allowed tag; disallowed wrapper (`<div>`) dropped but child kept; `<strong>`/`<em>` flattened to text; `<a>` removed entirely with its text kept; `<ol>` handling (see below).

Assert on the **absence of the dangerous thing**, not on exact output strings where possible — `expect(out).not.toMatch(/onerror|javascript:|<script/i)` alongside the positive assertion. Exact-string assertions on the preservation cases are fine and valuable.

Two traps specific to the narrow allowlist:

> Don't write `expect(sanitize('<a href="javascript:…">x</a>')).toBe("")`. It returns `x` — the element is gone but its text survives. Assert `.not.toContain("<a")`.

> Include the regression test `<ol><li>a</li></ol>` → `<ul><li>a</li></ul>`. The transform is the only thing preventing orphan `<li>` output, so it needs a test that fails if someone removes it.

### Component — `src/components/atoms/RichText/RichText.test.tsx` (RTL, jsdom)

Behaviour, not implementation:

- Renders a paragraph and a list from real API HTML — query by role (`getByRole("list")`, `getAllByRole("listitem")`).
- Given `<p>ok</p><script>alert(1)</script>`, the container has **no `script` element** and the text `alert(1)` does not appear.
- Given `<p onclick="alert(1)">x</p>`, the rendered paragraph has no `onclick` attribute.
- Returns `null` for an empty string and for input that sanitizes to empty (`<script>…</script>` alone) — no empty wrapper in the DOM.
- **Regression guard:** a test asserting the component sanitizes input it is given directly, so nobody "optimizes" the sanitize call out of the component and into a mapper.

### Storybook — `RichText.stories.tsx`

Stories: real product description (`<p>` + `<ul>`), collection description (single `<p>`), long copy, and a **"Hostile input"** story feeding the malicious sample. The a11y addon runs axe on each; the hostile story doubles as a live demo that nothing executes. This is the kind of thing worth having on the deployed Storybook for the portfolio story.

### E2E — Playwright

No dedicated spec. The PDP spec already visits `/products/[handle]`; add one assertion that `page.locator('[data-testid="product-description"] script')` has count 0, and let the existing axe check cover the rendered markup. Not worth more than that.

### Coverage

`src/lib/sanitize/` is pure and fully exercised by the unit table — 100 % is realistic and keeps the `src/lib/**` ≥ 80 % gate comfortable.

---

## Risks / open questions

1. ~~**`transformTags` + `allowedAttributes` interaction is unverified.**~~ **Closed by Decision 2.** `<a>` is not allowed, so the `rel`/`target` injection is gone. The one remaining `transformTags` use (`ol` → `ul`) was measured directly and does not depend on the attribute re-check.
2. ~~**`<ol>` degrades into orphan `<li>` elements.**~~ **Closed by Decision 2** — `transformTags: { ol: "ul" }` approved. Keep the regression test, since the transform is the only thing standing between `<ol>` input and a serious axe violation.
3. ~~**A `'use client'` file importing `RichText` silently ships 17 packages to the browser.**~~ **Closed by Decision 7** — both ESLint guards approved. Note the second one is a `react/no-danger` **inline scoped disable** at the two legitimate call sites, not a file- or directory-level override; `eslint.config.mjs` currently has no such rule at all (`eslint-config-next` does not enable `react/no-danger`), so the rule has to be turned on first.
4. **`dayjs` (1.9 MB) arrives via `launder` → `sanitize-html`** for what is, as far as this project is concerned, nothing. It does not reach the client, but it is in the Docker image. Acceptable; noted so it is not a surprise when the image is measured.
5. **`postcss` is bundled even with `parseStyleAttributes: false`** (static `require`). Same category as above — server-only weight, no runtime cost.
6. **`sanitize-html` has had CVEs** (historically around `allowedSchemes` bypasses and `iframe` hostname checks) — all in versions well before 2.17. With `allowedAttributes: {}` we use neither `allowedIframeHostnames`, `allowedStyles` nor any scheme handling, which is where most of them lived. Dependabot is already configured; keep it current.
7. **Sanitization is not a substitute for CSP.** A `Content-Security-Policy` header without `unsafe-inline` for scripts would make even a sanitizer bypass inert. Out of scope by Decision 5; on `context/new-feature-list.md`. Note that the `JsonLd` `<script type="application/ld+json">` blocks are not executable scripts and are unaffected by `script-src`.
8. **Styling injected HTML by element selector** is the one legitimate exception to the "CSS Modules class names only" convention. Flagging it so it does not get filed as a standards violation at review.
9. **Open:** should the E2E axe check run against a page with hostile content? It cannot — the real API returns clean data, and mocking the API in E2E contradicts "E2E runs against the real mock.shop API" (coding standards §Testing). The Storybook hostile story covers this instead.

---

## Still open

**Nothing.** All seven decisions are resolved under "Decisions" at the top of this file, and this research is closed. Implementation is specified in `context/features/011-product-page-spec.md`.

Two things that spec asks to confirm at implementation time, both carried from the risk list:

1. **Run the sanitizer inside a real Next.js Server Component request.** Everything here was measured in a throwaway Node harness and in this repo's Vitest `client` project config — never inside a live RSC render. Check one real product's description on the dev server before calling it done.
2. **Check whether any variant is `availableForSale: false`** before building the out-of-stock path. Unrelated to sanitization; noted because the spec pairs the two verification items.

---

## Sources

- **Context7 `/apostrophecms/sanitize-html`**: `sanitizeHtml.defaults` full literal (default `allowedTags`, `nonTextTags`, `allowedSchemes`, `disallowedTagsMode`), complete configuration options table, `sanitizeHtml.simpleTransform` API reference, `transformTags` attribute re-checking note, `parseStyleAttributes` / `allowedStyles` conflict.
- **Live API observations, 2026-09-23** (`https://apparel-outdoor.mock.shop/api`, POST, `X-Shopify-Storefront-Access-Token: public`): `descriptionHtml` for all 30 products and all 4 collections — tag census, attribute census, entity census, length and shape analysis in §1.
- **Local measurements, 2026-09-23**, in a scratch directory outside the repo (Node 24.19.0, npm, macOS):
  - `sanitize-html@2.17.7` against 24 inputs with a wide allowlist (first pass), then **re-run against the 24 inputs in §5 with the final narrow options** after the architect's decisions — including the `<ol>` degradation and the `transformTags: { ol: "ul" }` fix.
  - `dompurify@3.4.16` in bare Node: `isSupported === false`, `sanitize` not a function (§2).
  - Install footprints: `sanitize-html` 4.1 MB / 17 pkgs; `isomorphic-dompurify` 28 MB / 33 pkgs; `rehype-parse` + `rehype-sanitize` + `rehype-stringify` + `unified` 4.6 MB / 46 pkgs.
  - `sanitize-html` under the repo's own `vitest@5.0.1` with `environment: "jsdom"` and `resolve.conditions: ["browser", …defaultClientConditions]` — 1 test file, 1 test, passed (§4).
- **npm registry, 2026-09-23**: versions, dependency lists, licenses and `dist.unpackedSize` for `sanitize-html`, `dompurify`, `isomorphic-dompurify`, `xss`, `ultrahtml`, `jsdom`, `rehype-sanitize`, `hast-util-sanitize`, `happy-dom`, `linkedom`, `@types/sanitize-html`.
- **Repo inspection**: `vitest.config.ts` (two projects, resolve conditions, coverage thresholds), `eslint.config.mjs` (no `react/no-danger`), `src/components/atoms/JsonLd/JsonLd.tsx` (existing dedicated-escape-hatch precedent), `src/types/catalog.ts`, `src/lib/graphql/documents/fragments.graphql`.
