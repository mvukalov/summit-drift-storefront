import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MenuItem } from "@/types/navigation";
import { Footer } from "./Footer";

const ITEMS: MenuItem[] = [
  { title: "Summit Protection Shells", href: "/collections/summit-protection-shells" },
  { title: "Expedition Field Gear", href: "/collections/expedition-field-gear" },
];

describe("Footer", () => {
  it("renders the brand blurb", () => {
    render(<Footer items={ITEMS} />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      /Expedition-grade apparel cut for the long climb/,
    );
  });

  it("links every collection from the menu items", () => {
    render(<Footer items={ITEMS} />);

    const nav = screen.getByRole("navigation", { name: "Collections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Summit Protection Shells", "/collections/summit-protection-shells"],
      ["Expedition Field Gear", "/collections/expedition-field-gear"],
    ]);
  });

  it("omits the collections column when there are no menu items", () => {
    render(<Footer items={[]} />);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Summit Drift");
  });

  it.each([
    ["with menu items", ITEMS],
    ["without menu items", []],
  ])("credits the author and links the source %s", (_, items) => {
    render(<Footer items={items} />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("Portfolio project by Martin Vukalović");
    expect(footer).toHaveTextContent("Summit Drift is a fictional brand.");
    expect(screen.getByRole("link", { name: "Source on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/mvukalov/summit-drift-storefront",
    );
  });
});
