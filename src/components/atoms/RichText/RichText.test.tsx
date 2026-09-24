import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText } from "./RichText";

const PRODUCT_HTML =
  "<p>Early mornings on the river call for a jacket that blocks out the damp.</p>" +
  "<ul><li>Advanced waterproof membrane</li><li>Ventilation panels</li></ul>";

describe("RichText", () => {
  it("renders the description as structured markup, not as visible tags", () => {
    render(<RichText html={PRODUCT_HTML} />);

    expect(screen.getByText(/Early mornings on the river call for a jacket/)).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  // The component takes raw HTML and sanitizes it itself. These assertions are the reason
  // that matters: if someone moves sanitization out to a mapper, they fail.
  describe("sanitizes what it is given", () => {
    it("renders no script element and does not show its source as text", () => {
      const { container } = render(<RichText html="<p>ok</p><script>alert(1)</script>" />);

      expect(container.querySelector("script")).toBeNull();
      expect(screen.queryByText(/alert\(1\)/)).not.toBeInTheDocument();
      expect(screen.getByText("ok")).toBeInTheDocument();
    });

    it("strips inline event handlers from an allowed element", () => {
      render(<RichText html='<p onclick="alert(1)">click</p>' />);

      expect(screen.getByText("click")).not.toHaveAttribute("onclick");
    });

    it("renders no anchor for a javascript: link but keeps its text", () => {
      const { container } = render(<RichText html='<a href="javascript:alert(1)">x</a>' />);

      expect(container.querySelector("a")).toBeNull();
      expect(screen.getByText("x")).toBeInTheDocument();
    });

    it("keeps list items inside a list when the source used an ordered list", () => {
      render(<RichText html="<ol><li>a</li><li>b</li></ol>" />);

      // Orphan <li> elements would have no list role for assistive technology.
      expect(screen.getByRole("list")).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });
  });

  describe("renders nothing rather than an empty wrapper", () => {
    it.each([
      ["the html is empty", ""],
      ["everything is stripped", "<script>alert(1)</script>"],
    ])("renders no element when %s", (_label, html) => {
      const { container } = render(<RichText html={html} />);

      expect(container).toBeEmptyDOMElement();
    });
  });
});
