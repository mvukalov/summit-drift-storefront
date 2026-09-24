import sanitizeHtml from "sanitize-html";

// The Storefront API returns `descriptionHtml` as rich text, so it reaches the DOM through
// `dangerouslySetInnerHTML` and has to be sanitized first (coding standards §Security).
// `sanitize-html` parses with htmlparser2 and needs no DOM, which is why it works in a
// Server Component; DOMPurify would silently degrade to a no-op there (docs/html-sanitization.md §2).

/**
 * Exactly the tags the live API returns, verified across all 30 products and all 4
 * collections on 2026-09-23. Deliberately not a wider "Shopify rich text" guess: anything
 * outside this list is dropped while its text is kept, so richer copy would still read
 * correctly, just without its markup.
 */
const ALLOWED_TAGS = ["p", "ul", "li"] as const;

/**
 * Tags whose content is markup or code rather than prose. Without this, `discard` mode
 * would keep the *text* of a disallowed tag, rendering `alert(1)` as visible page copy.
 */
const NON_TEXT_TAGS = [
  "script",
  "style",
  "textarea",
  "option",
  "noscript",
  "iframe",
  "object",
  "embed",
  "template",
] as const;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  // The API sends no attributes at all. Allowing none means no `href`, `src` or `style`
  // can reach the DOM, so there is no URL-scheme surface to police either.
  allowedAttributes: {},
  // Drop the tag, keep its text.
  disallowedTagsMode: "discard",
  nonTextTags: [...NON_TEXT_TAGS],
  // No attribute survives, so `style` never reaches PostCSS. Skip the parse.
  parseStyleAttributes: false,
  // `ol` is not allowed, and discarding it would leave its `<li>` children without a list
  // parent: invalid HTML, no list semantics for a screen reader, and a serious axe
  // violation. Renaming keeps the structure; bullets instead of numbers is the trade-off.
  transformTags: { ol: "ul" },
};

/**
 * Strips everything outside the allowlist from API-supplied HTML.
 *
 * Callers pass the raw value. Sanitizing is not their job — `RichText` is the only
 * component that renders the result, and it calls this itself, so there is no code path
 * that can render `descriptionHtml` unsanitized.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
