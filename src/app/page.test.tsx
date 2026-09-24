import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { getCollections } from "@/lib/catalog/fetchers";
import { toCollectionSummary, toProductCard } from "@/lib/catalog/mappers";
import { collectionsFixture } from "@/test/msw/fixtures/collections";
import { featuredProductsFixture } from "@/test/msw/fixtures/featuredProducts";

// Real API responses mapped to domain types, as the fetchers return them.
vi.mock("@/lib/catalog/fetchers", () => ({
  getCollections: vi.fn(async () => collectionsFixture.collections.nodes.map(toCollectionSummary)),
  getFeaturedProducts: vi.fn(async () =>
    featuredProductsFixture.collections.nodes.flatMap((collection) =>
      collection.products.nodes.map(toProductCard),
    ),
  ),
}));

function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

describe("Home page", () => {
  it("renders the hero headline as the only level-1 heading", async () => {
    render(await Home());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Built for the long climb, worn past the summit.",
      }),
    ).toBeInTheDocument();
  });

  it("links the hero calls to action to the page sections", async () => {
    render(await Home());

    expect(screen.getByRole("link", { name: "Shop the collection" })).toHaveAttribute(
      "href",
      "#collections",
    );
    expect(screen.getByRole("link", { name: "Shop sale" })).toHaveAttribute("href", "#featured");
  });

  it("has no hero image and no high-priority image on the page", async () => {
    render(await Home());

    expect(
      within(section("Built for the long climb, worn past the summit.")).queryByRole("img"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("img").filter((img) => img.getAttribute("fetchpriority") === "high"),
    ).toEqual([]);
  });

  it("renders collections without images when the API returns none", async () => {
    const collections = collectionsFixture.collections.nodes.map(toCollectionSummary);
    vi.mocked(getCollections).mockResolvedValueOnce(
      collections.map((collection) => ({ ...collection, image: null })),
    );

    render(await Home());

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(within(section("Collections")).getAllByRole("link")).toHaveLength(4);
  });

  it("loads every image eagerly", async () => {
    render(await Home());

    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("loading", "eager");
    }
  });

  it("gives collection tile images empty alt text, since the title is right below", async () => {
    render(await Home());

    const tiles = within(section("Collections")).getAllByRole("listitem");
    for (const tile of tiles) {
      expect(tile.querySelector("img")).toHaveAttribute("alt", "");
    }
  });

  it("links each of the four collections to its collection page", async () => {
    render(await Home());

    const links = within(section("Collections")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/collections/summit-protection-shells",
      "/collections/trail-foundation-layers",
      "/collections/rugged-traverse-bottoms",
      "/collections/expedition-field-gear",
    ]);
  });

  it("shows one featured product per collection, with sale badges only on sale items", async () => {
    render(await Home());

    const cards = within(section("Featured")).getAllByRole("article");
    expect(cards).toHaveLength(4);
    expect(
      cards
        .filter((card) => within(card).queryByText("Sale"))
        .map((card) => within(card).getByRole("heading").textContent),
    ).toEqual(["Waterproof Wading Jacket With Breathable Shell", "Performance Technical Tee"]);
    expect(
      within(section("Featured")).getByRole("link", { name: "Performance Technical Tee" }),
    ).toHaveAttribute("href", "/products/performance-technical-tee");
  });
});
