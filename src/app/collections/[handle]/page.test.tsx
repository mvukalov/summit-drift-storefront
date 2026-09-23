import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CollectionPage, { generateMetadata } from "./page";
import { getCollection } from "@/lib/catalog/fetchers";
import { toCollectionSummary, toProductCard } from "@/lib/catalog/mappers";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";

const { collection } = collectionByHandleFixture;
const HANDLE = collection.handle;
const PATH = `/collections/${HANDLE}`;

function fixtureResult() {
  return {
    collection: toCollectionSummary(collection),
    products: collection.products.nodes.map(toProductCard),
  };
}

vi.mock("@/lib/catalog/fetchers", () => ({
  getCollection: vi.fn(),
}));

// notFound() throws in Next; the mock keeps that contract so the page can't fall through.
const notFoundError = new Error("NEXT_NOT_FOUND");
const push = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw notFoundError;
  },
  // The toolbar, sidebar and drawer are rendered for real, so they need a router.
  useRouter: () => ({ push }),
}));

/** The desktop sidebar's copy of the facet controls; the drawer holds a second one. */
function sidebar() {
  return within(screen.getByRole("complementary", { name: "Filters" }));
}

function props(handle = HANDLE, searchParams: Record<string, string | string[]> = {}) {
  return {
    params: Promise.resolve({ handle }),
    searchParams: Promise.resolve(searchParams),
  } as unknown as PageProps<"/collections/[handle]">;
}

beforeEach(() => {
  push.mockClear();
  vi.mocked(getCollection).mockResolvedValue(fixtureResult());
});

describe("Collection page", () => {
  it("renders the collection title as the only level-1 heading", async () => {
    render(await CollectionPage(props()));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Summit Protection Shells");
  });

  // The product cards are h3, so the page needs an h2 between them and the title.
  it("keeps the heading levels in order down to the product cards", async () => {
    render(await CollectionPage(props()));

    const levels = screen
      .getAllByRole("heading")
      .map((heading) => Number(heading.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    for (const [index, level] of levels.entries()) {
      if (index > 0) {
        expect(level - levels[index - 1]!).toBeLessThanOrEqual(1);
      }
    }
  });

  it("names the product grid for screen readers", async () => {
    render(await CollectionPage(props()));

    expect(screen.getByRole("region", { name: "Products" })).toBeInTheDocument();
  });

  it("shows the collection description", async () => {
    render(await CollectionPage(props()));

    expect(screen.getByText(/Weatherproof gear featuring an earthy muted palette/)).toBeVisible();
  });

  it("renders one card per product, linked to the product page", async () => {
    render(await CollectionPage(props()));

    expect(screen.getAllByRole("article")).toHaveLength(8);
    expect(
      screen.getByRole("link", { name: "Waterproof Wading Jacket With Breathable Shell" }),
    ).toHaveAttribute("href", "/products/waterproof-wading-jacket-with-breathable-shell");
  });

  it("counts the products", async () => {
    render(await CollectionPage(props()));

    expect(screen.getByText("8 products")).toBeVisible();
  });

  it("uses the singular for a collection of one", async () => {
    const { collection: summary, products } = fixtureResult();
    vi.mocked(getCollection).mockResolvedValue({ collection: summary, products: [products[0]!] });

    render(await CollectionPage(props()));

    expect(screen.getByText("1 product")).toBeVisible();
  });

  it("shows an empty state instead of a blank grid", async () => {
    vi.mocked(getCollection).mockResolvedValue({
      collection: fixtureResult().collection,
      products: [],
    });

    render(await CollectionPage(props()));

    expect(screen.getByText(/no products in this collection/i)).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    // Filters over an empty collection would offer nothing to filter.
    expect(screen.queryByRole("complementary", { name: "Filters" })).not.toBeInTheDocument();
  });

  describe("facets", () => {
    it("renders the collection's own axes in the sidebar", async () => {
      render(await CollectionPage(props()));

      expect(sidebar().getByRole("group", { name: "Color" })).toBeInTheDocument();
      expect(sidebar().getByRole("group", { name: "Size" })).toBeInTheDocument();
    });

    // Every product in this collection offers every colour and size, so `sale` is the
    // facet that actually narrows it: 3 of the 8 are discounted.
    it("filters the grid by the facets in the URL", async () => {
      render(await CollectionPage(props(HANDLE, { sale: "1" })));

      expect(screen.getAllByRole("article")).toHaveLength(3);
    });

    it("counts the filtered products, not the collection", async () => {
      render(await CollectionPage(props(HANDLE, { sale: "1" })));

      expect(screen.getByText("3 products")).toBeVisible();
    });

    it("keeps the grid in the order the API sorted it", async () => {
      render(await CollectionPage(props(HANDLE, { sale: "1" })));

      expect(
        screen.getAllByRole("heading", { level: 3 }).map((card) => card.textContent),
      ).toStrictEqual([
        "Waterproof Wading Jacket With Breathable Shell",
        "Oversized T-Shirt",
        "Oversized Outerwear Jacket",
      ]);
    });

    it("shows a chip per active filter", async () => {
      render(await CollectionPage(props(HANDLE, { color: "slate", sale: "1" })));

      const chips = within(screen.getByRole("list", { name: "Active filters" }));
      expect(chips.getAllByRole("button").map((chip) => chip.textContent)).toStrictEqual([
        "Slate",
        "On sale",
      ]);
    });

    // A stale or hand-edited URL must still render the collection (phase 1's contract).
    it("ignores a value the collection does not offer", async () => {
      render(await CollectionPage(props(HANDLE, { color: "ultraviolet" })));

      expect(screen.getAllByRole("article")).toHaveLength(8);
      expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
    });

    // A collection with no products and a filter that matches none are different problems.
    // The collection's prices are 25 – 485 with a gap between 249 and 485, so this range
    // is valid, survives clamping, and matches nothing.
    it("distinguishes no matches from an empty collection", async () => {
      render(await CollectionPage(props(HANDLE, { price: "300-400" })));

      expect(screen.getByText("No products match these filters.")).toBeVisible();
      expect(screen.queryByText(/no products in this collection/i)).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Clear all filters" })).toHaveAttribute("href", PATH);
      expect(screen.getByText("0 products")).toBeVisible();
    });

    it("keeps the sort in the way back from an empty result", async () => {
      render(await CollectionPage(props(HANDLE, { price: "300-400", sort: "price-asc" })));

      expect(screen.getByRole("link", { name: "Clear all filters" })).toHaveAttribute(
        "href",
        `${PATH}?sort=price-asc`,
      );
    });
  });

  it("404s on an unknown handle", async () => {
    vi.mocked(getCollection).mockResolvedValue(null);

    await expect(CollectionPage(props("does-not-exist"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("asks the API for the sort from the URL", async () => {
    await CollectionPage(props(HANDLE, { sort: "price-desc" }));

    expect(getCollection).toHaveBeenCalledWith(HANDLE, "price-desc");
  });

  it("falls back to the default sort for an invalid param", async () => {
    await CollectionPage(props(HANDLE, { sort: "cheapest" }));

    expect(getCollection).toHaveBeenCalledWith(HANDLE, "featured");
  });

  it("hands the resolved sort to the control, so it matches the grid", async () => {
    render(await CollectionPage(props(HANDLE, { sort: "best-selling" })));

    expect(screen.getByRole("combobox", { name: "Sort:" })).toHaveValue("best-selling");
  });

  it("renders a BreadcrumbList from Home to this collection", async () => {
    const { container } = render(await CollectionPage(props()));

    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "");
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(
      data.itemListElement.map((entry: { name: string; position: number }) => [
        entry.position,
        entry.name,
      ]),
    ).toEqual([
      [1, "Home"],
      [2, "Summit Protection Shells"],
    ]);
  });
});

describe("Collection page metadata", () => {
  it("titles the page after the collection", async () => {
    const metadata = await generateMetadata(props());

    expect(metadata.title).toBe("Summit Protection Shells");
    expect(metadata.description).toMatch(/Weatherproof gear/);
  });

  // Filter and sort combinations must not read as duplicate content (§5.5).
  it.each([
    ["no params", {}],
    ["a sort param", { sort: "price-asc" }],
    ["an invalid sort param", { sort: "cheapest" }],
    ["facet params", { color: "moss,clay", sale: "1", price: "25-200" }],
    ["facets and sort together", { color: "moss", sort: "price-asc" }],
  ])("canonicalises to the clean collection URL with %s", async (_label, searchParams) => {
    const metadata = await generateMetadata(props(HANDLE, searchParams));

    expect(metadata.alternates?.canonical).toBe(PATH);
  });

  it("does not claim a title for an unknown handle", async () => {
    vi.mocked(getCollection).mockResolvedValue(null);

    const metadata = await generateMetadata(props("does-not-exist"));

    expect(metadata.title).toBe("Collection not found");
    expect(metadata.alternates?.canonical).toBeUndefined();
  });
});
