import { render, screen } from "@testing-library/react";
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
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw notFoundError;
  },
}));

vi.mock("./SortControl", () => ({
  SortControl: ({ value, basePath }: { value: string; basePath: string }) => (
    <div data-testid="sort-control" data-value={value} data-base-path={basePath} />
  ),
}));

function props(handle = HANDLE, searchParams: Record<string, string | string[]> = {}) {
  return {
    params: Promise.resolve({ handle }),
    searchParams: Promise.resolve(searchParams),
  } as unknown as PageProps<"/collections/[handle]">;
}

beforeEach(() => {
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
    expect(screen.getByText("0 products")).toBeVisible();
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

    const control = screen.getByTestId("sort-control");
    expect(control).toHaveAttribute("data-value", "best-selling");
    expect(control).toHaveAttribute("data-base-path", PATH);
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
