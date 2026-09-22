import { describe, expect, it } from "vitest";
import { buildBreadcrumbList } from "./breadcrumbs";
import { SITE_URL, absoluteUrl } from "./site";

describe("absoluteUrl", () => {
  it("resolves a site-relative path against the site origin", () => {
    expect(absoluteUrl("/collections/summit-protection-shells")).toBe(
      `${SITE_URL}/collections/summit-protection-shells`,
    );
  });

  it("keeps the root path", () => {
    expect(absoluteUrl("/")).toBe(`${SITE_URL}/`);
  });
});

describe("buildBreadcrumbList", () => {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Summit Protection Shells", path: "/collections/summit-protection-shells" },
  ];

  it("builds a schema.org BreadcrumbList", () => {
    const list = buildBreadcrumbList(trail);

    expect(list["@context"]).toBe("https://schema.org");
    expect(list["@type"]).toBe("BreadcrumbList");
  });

  it("numbers items from 1, in trail order", () => {
    const list = buildBreadcrumbList(trail);

    expect(list.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Summit Protection Shells",
        item: `${SITE_URL}/collections/summit-protection-shells`,
      },
    ]);
  });

  // Consumers (Google) reject relative URLs in `item`.
  it("serializes every item as an absolute URL", () => {
    const list = buildBreadcrumbList(trail) as {
      itemListElement: { item: string }[];
    };

    for (const entry of list.itemListElement) {
      expect(() => new URL(entry.item)).not.toThrow();
    }
  });

  it("returns an empty list for an empty trail", () => {
    expect(buildBreadcrumbList([]).itemListElement).toEqual([]);
  });
});
