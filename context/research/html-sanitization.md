# HTML Sanitization Research

## Output

`docs/html-sanitization.md`

## Research

Product `descriptionHtml` contains HTML (`<p>`, `<ul>`, `<li>`). How do we render it safely in a Server Component?

## Include

- Library options for sanitizing on the server (e.g. DOMPurify with a server DOM, `sanitize-html`, others) — bundle and runtime impact
- Allowed tags/attributes for product descriptions
- One dedicated component that owns `dangerouslySetInnerHTML`
- Unit tests with malicious input (script tags, event handlers, `javascript:` URLs)

## Sources

- Context7 for the chosen library
- Live API `descriptionHtml` samples
