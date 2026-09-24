import { describe, expect, it } from "vitest";

import { sanitizeRichText } from "./rich-text";

// The attack cases and the expected output for each were measured against sanitize-html
// 2.17.7 before this code existed; see docs/html-sanitization.md §5. They are asserted
// here so an upgrade or an options change that reopens one of them fails the build.

describe("sanitizeRichText", () => {
  describe("strips script execution vectors", () => {
    it.each([
      ["script tag after content", "<p>ok</p><script>alert(1)</script>", "<p>ok</p>"],
      ["script tag alone", '<script>alert("xss")</script>', ""],
      ["unclosed script tag", "<p>hello<script>alert(1)", "<p>hello</p>"],
      ["inline event handler", '<p onclick="alert(1)">click</p>', "<p>click</p>"],
      ["img with onerror", "<img src=x onerror=alert(1)>", ""],
      ["svg with onload", "<svg onload=alert(1)></svg>", ""],
      ["iframe", '<iframe src="https://evil.com"></iframe>', ""],
      ["form and input", '<form action="/x"><input name="a"></form>', ""],
      ["style tag", "<style>body{display:none}</style><p>after</p>", "<p>after</p>"],
      ["mXSS via noscript", '<noscript><p title="</noscript><img src=x onerror=alert(1)>">', ""],
    ])("removes %s", (_label, input, expected) => {
      expect(sanitizeRichText(input)).toBe(expected);
    });

    // A broad net over the same inputs: even if the exact output above changes, none of
    // these substrings may ever survive into the DOM.
    it.each([
      "<p>ok</p><script>alert(1)</script>",
      '<p onclick="alert(1)">click</p>',
      "<img src=x onerror=alert(1)>",
      "<svg onload=alert(1)></svg>",
      '<a href="javascript:alert(1)">x</a>',
      '<p style="background:url(javascript:alert(1))">x</p>',
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    ])("leaves no executable residue in %s", (input) => {
      expect(sanitizeRichText(input)).not.toMatch(/<script|javascript:|on\w+\s*=/i);
    });
  });

  describe("strips all attributes", () => {
    it("drops a style attribute but keeps the element", () => {
      expect(sanitizeRichText('<p style="background:url(javascript:alert(1))">x</p>')).toBe(
        "<p>x</p>",
      );
    });

    it("drops class and id from an allowed tag", () => {
      expect(sanitizeRichText('<p class="x" id="y">text</p>')).toBe("<p>text</p>");
    });
  });

  describe("drops disallowed tags but keeps their text", () => {
    it.each([
      ["a wrapper element", "<div><p>kept</p></div>", "<p>kept</p>"],
      [
        "inline formatting",
        "<p>Very <strong>bold</strong> and <em>italic</em></p>",
        "<p>Very bold and italic</p>",
      ],
      ["a heading", "<h2>Title</h2><p>body</p>", "Title<p>body</p>"],
    ])("unwraps %s", (_label, input, expected) => {
      expect(sanitizeRichText(input)).toBe(expected);
    });

    // `<a>` is not allowed, so the element disappears entirely rather than surviving as an
    // inert `<a>` without its href. This is what makes the rel/target question moot.
    it.each([
      ["a javascript: link", '<a href="javascript:alert(1)">x</a>', "x"],
      ["an external link", '<a href="https://example.com" target="_blank">link</a>', "link"],
    ])("removes %s entirely, keeping its text", (_label, input, expected) => {
      const output = sanitizeRichText(input);
      expect(output).toBe(expected);
      expect(output).not.toContain("<a");
    });
  });

  // Regression guard for transformTags. Without it `<ol>` is discarded and its children are
  // left as orphan `<li>` elements: invalid HTML and a serious axe `listitem` violation.
  describe("renames ol to ul so list items keep a parent", () => {
    it("renames the wrapper and keeps the items", () => {
      expect(sanitizeRichText("<ol><li>a</li><li>b</li></ol>")).toBe(
        "<ul><li>a</li><li>b</li></ul>",
      );
    });

    it("never emits a list item without a list parent", () => {
      expect(sanitizeRichText("<p>x</p><ol><li>a</li></ol>")).toBe("<p>x</p><ul><li>a</li></ul>");
    });

    it("still strips attributes from the renamed tag", () => {
      expect(sanitizeRichText('<ol onclick="alert(1)"><li>a</li></ol>')).toBe(
        "<ul><li>a</li></ul>",
      );
    });
  });

  // The two shapes the live API actually returns (docs/html-sanitization.md §1). These must
  // pass through untouched, or the sanitizer is eating real product copy.
  describe("preserves real API content", () => {
    it("passes a product description through unchanged", () => {
      const html =
        "<p>Early mornings on the river call for a jacket that blocks out the damp.</p>" +
        "<ul><li>Advanced waterproof membrane</li><li>Ventilation panels</li></ul>";

      expect(sanitizeRichText(html)).toBe(html);
    });

    it("passes a collection description through unchanged", () => {
      const html = "<p>Weatherproof gear featuring an earthy muted palette.</p>";

      expect(sanitizeRichText(html)).toBe(html);
    });

    it("does not double-escape entities", () => {
      expect(sanitizeRichText("<p>5 &lt; 10 &amp; rising</p>")).toBe(
        "<p>5 &lt; 10 &amp; rising</p>",
      );
    });

    it("keeps the typographic characters the catalog uses", () => {
      expect(sanitizeRichText("<p>city’s moods — yes</p>")).toBe("<p>city’s moods — yes</p>");
    });
  });

  describe("edge cases", () => {
    it("returns an empty string for empty input", () => {
      expect(sanitizeRichText("")).toBe("");
    });

    it("returns text that contains no tags unchanged", () => {
      expect(sanitizeRichText("no tags at all")).toBe("no tags at all");
    });

    it("returns an empty string when every tag is stripped", () => {
      expect(sanitizeRichText("<script>alert(1)</script>")).toBe("");
    });
  });
});
