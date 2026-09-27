import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSearchResults } from "@/lib/catalog/fetchers";
import { toProductCard } from "@/lib/catalog/mappers";
import { searchFixture } from "@/test/msw/fixtures/search";
import type { ProductCard } from "@/types/catalog";
import SearchPage, { generateMetadata } from "./page";

vi.mock("@/lib/catalog/fetchers", () => ({
  getSearchResults: vi.fn(),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  // The sort control is rendered for real, so it needs a router.
  useRouter: () => ({ push }),
}));

/** The 3 captured "jacket" results, as the fetcher returns them. */
const JACKETS = searchFixture.search.edges.map((edge) => toProductCard(edge.node));

/** `count` distinct products, for pagination: more than one page (16) of them. */
function manyProducts(count: number): ProductCard[] {
  return Array.from({ length: count }, (_, index) => ({
    ...JACKETS[index % JACKETS.length]!,
    handle: `product-${index + 1}`,
    title: `Product ${index + 1}`,
  }));
}

function props(searchParams: Record<string, string | string[]> = {}) {
  return { searchParams: Promise.resolve(searchParams) } as unknown as PageProps<"/search">;
}

beforeEach(() => {
  push.mockClear();
  vi.mocked(getSearchResults).mockResolvedValue({ products: JACKETS, totalCount: 3 });
});

describe("generateMetadata", () => {
  it("keeps every search page out of the index", async () => {
    const metadata = await generateMetadata(props({ q: "jacket" }));

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("reflects the query in the title", async () => {
    expect((await generateMetadata(props({ q: "jacket" }))).title).toBe(
      "Search results for “jacket”",
    );
  });

  it("falls back to a plain title with no query", async () => {
    expect((await generateMetadata(props())).title).toBe("Search");
  });
});

describe("Search page", () => {
  it("asks for a query when there is none", async () => {
    vi.mocked(getSearchResults).mockResolvedValue({ products: [], totalCount: 0 });

    render(await SearchPage(props()));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Search");
    expect(screen.getByText(/Type what you're looking for/)).toBeInTheDocument();
    expect(screen.queryByText(/No products match/)).not.toBeInTheDocument();
  });

  // Distinct from the no-query state above: a query was made, it just matched nothing.
  it("says nothing matched, and suggests checking the spelling", async () => {
    vi.mocked(getSearchResults).mockResolvedValue({ products: [], totalCount: 0 });

    render(await SearchPage(props({ q: "jaket" })));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Results for “jaket”");
    expect(screen.getByText(/No products match “jaket”. Check the spelling/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Sort:" })).not.toBeInTheDocument();
  });

  it("shows the count, the sort control and one card per result", async () => {
    render(await SearchPage(props({ q: "jacket" })));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Results for “jacket”");
    expect(screen.getByText("3 results")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort:" })).toHaveValue("relevance");
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("uses the singular for a single result", async () => {
    vi.mocked(getSearchResults).mockResolvedValue({ products: JACKETS.slice(0, 1), totalCount: 1 });

    render(await SearchPage(props({ q: "wading" })));

    expect(screen.getByText("1 result")).toBeInTheDocument();
  });

  it("keeps the heading levels in order down to the product cards", async () => {
    render(await SearchPage(props({ q: "jacket" })));

    const levels = screen
      .getAllByRole("heading")
      .map((heading) => Number(heading.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    for (const [index, level] of levels.entries()) {
      if (index > 0) expect(level - levels[index - 1]!).toBeLessThanOrEqual(1);
    }
    expect(screen.getByRole("region", { name: "Results" })).toBeInTheDocument();
  });

  it("passes the query and sort from the URL to the fetcher", async () => {
    render(await SearchPage(props({ q: "jacket", sort: "price-desc" })));

    expect(getSearchResults).toHaveBeenCalledWith("jacket", "price-desc");
    expect(screen.getByRole("combobox", { name: "Sort:" })).toHaveValue("price-desc");
  });

  it("falls back to relevance for an invalid sort instead of erroring", async () => {
    render(await SearchPage(props({ q: "jacket", sort: "cheapest" })));

    expect(getSearchResults).toHaveBeenCalledWith("jacket", "relevance");
  });

  it("shows no pagination when everything fits on one page", async () => {
    render(await SearchPage(props({ q: "jacket" })));

    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });

  describe("across more than one page", () => {
    beforeEach(() => {
      vi.mocked(getSearchResults).mockResolvedValue({
        products: manyProducts(20),
        totalCount: 20,
      });
    });

    it("shows the first 16 on page 1, with only a Next link", async () => {
      render(await SearchPage(props({ q: "jacket", sort: "price-asc" })));

      expect(screen.getAllByRole("article")).toHaveLength(16);
      const pagination = within(screen.getByRole("navigation", { name: "Pagination" }));
      expect(pagination.getByText("Page 1 of 2")).toBeInTheDocument();
      expect(pagination.queryByRole("link", { name: "Previous page" })).not.toBeInTheDocument();
      // The sort is carried into the next page's URL.
      expect(pagination.getByRole("link", { name: "Next page" })).toHaveAttribute(
        "href",
        "/search?q=jacket&sort=price-asc&page=2",
      );
    });

    it("shows the remainder on the last page, with only a Previous link", async () => {
      render(await SearchPage(props({ q: "jacket", page: "2" })));

      expect(screen.getAllByRole("article")).toHaveLength(4);
      const pagination = within(screen.getByRole("navigation", { name: "Pagination" }));
      expect(pagination.getByText("Page 2 of 2")).toBeInTheDocument();
      expect(pagination.getByRole("link", { name: "Previous page" })).toHaveAttribute(
        "href",
        "/search?q=jacket",
      );
      expect(pagination.queryByRole("link", { name: "Next page" })).not.toBeInTheDocument();
    });

    it("renders the last page for an out-of-range page number rather than an empty grid", async () => {
      render(await SearchPage(props({ q: "jacket", page: "99" })));

      expect(screen.getAllByRole("article")).toHaveLength(4);
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    });
  });
});
