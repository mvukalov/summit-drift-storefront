import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFacetsView } from "@/lib/facets/counts";
import { deriveFacets } from "@/lib/facets/derive";
import type { SelectedFacets } from "@/lib/facets/url";
import type { SortOption } from "@/lib/facets/sort";
import { makeProduct } from "@/test/products";
import { FilterPanel } from "./FilterPanel";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const PATH = "/collections/summit-protection-shells";

// moss+M ($50), moss+L ($150, on sale), clay+M ($300).
const products = [
  makeProduct({
    handle: "moss-m",
    price: "50.0",
    options: [
      { name: "color", values: ["moss"] },
      { name: "size", values: ["M"] },
    ],
  }),
  makeProduct({
    handle: "moss-l",
    price: "150.0",
    isOnSale: true,
    options: [
      { name: "color", values: ["moss"] },
      { name: "size", values: ["L"] },
    ],
  }),
  makeProduct({
    handle: "clay-m",
    price: "300.0",
    options: [
      { name: "color", values: ["clay"] },
      { name: "size", values: ["M"] },
    ],
  }),
];

function select(overrides: Partial<SelectedFacets> = {}): SelectedFacets {
  return { options: {}, price: null, onSale: false, ...overrides };
}

function renderPanel(selected = select(), sort: SortOption = "featured") {
  const onNavigate = vi.fn();
  render(
    <FilterPanel
      view={buildFacetsView(products, deriveFacets(products), selected)}
      selected={selected}
      basePath={PATH}
      sort={sort}
      onNavigate={onNavigate}
    />,
  );
  return { onNavigate };
}

beforeEach(() => {
  push.mockClear();
});

describe("FilterPanel", () => {
  it("renders a group per axis the collection has", () => {
    renderPanel();

    expect(screen.getByRole("group", { name: "Color" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Size" })).toBeInTheDocument();
  });

  it("shows only the values the collection actually offers, with counts", () => {
    renderPanel();

    expect(screen.getByRole("checkbox", { name: "Moss, 2 products" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Clay, 1 product" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /^Slate/ })).not.toBeInTheDocument();
  });

  describe("navigating", () => {
    it("puts a chosen value in the URL", async () => {
      renderPanel();

      await userEvent.click(screen.getByRole("checkbox", { name: /^Moss/ }));

      expect(push).toHaveBeenCalledWith(`${PATH}?color=moss`, { scroll: false });
    });

    it("adds a second value to the same axis", async () => {
      renderPanel(select({ options: { color: ["moss"] } }));

      await userEvent.click(screen.getByRole("checkbox", { name: /^Clay/ }));

      expect(push).toHaveBeenCalledWith(`${PATH}?color=moss,clay`, { scroll: false });
    });

    it("takes a value back out", async () => {
      renderPanel(select({ options: { color: ["moss"] } }));

      await userEvent.click(screen.getByRole("checkbox", { name: /^Moss/ }));

      expect(push).toHaveBeenCalledWith(PATH, { scroll: false });
    });

    // Filtering must never silently reorder the grid.
    it("keeps the current sort", async () => {
      renderPanel(select(), "price-desc");

      await userEvent.click(screen.getByRole("checkbox", { name: /^Moss/ }));

      expect(push).toHaveBeenCalledWith(`${PATH}?color=moss&sort=price-desc`, { scroll: false });
    });

    it("tells the drawer it can close", async () => {
      const { onNavigate } = renderPanel();

      await userEvent.click(screen.getByRole("checkbox", { name: /^Moss/ }));

      expect(onNavigate).toHaveBeenCalledOnce();
    });
  });

  describe("price", () => {
    it("offers the buckets the collection's prices fall into", () => {
      renderPanel();

      expect(screen.getByRole("radio", { name: "Any price" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "$50 – $150, 1 product" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "$150+, 2 products" })).toBeInTheDocument();
    });

    it("writes the chosen bucket as a range", async () => {
      renderPanel();

      await userEvent.click(screen.getByRole("radio", { name: /^\$150\+/ }));

      expect(push).toHaveBeenCalledWith(`${PATH}?price=150-300`, { scroll: false });
    });

    // A radio cannot be unchecked, so clearing the price needs an option of its own.
    it("clears the range from the Any price option", async () => {
      renderPanel(select({ price: { min: 150, max: 300 } }));

      await userEvent.click(screen.getByRole("radio", { name: "Any price" }));

      expect(push).toHaveBeenCalledWith(PATH, { scroll: false });
    });

    it("checks Any price while no range is selected", () => {
      renderPanel();

      expect(screen.getByRole("radio", { name: "Any price" })).toBeChecked();
    });

    it("is absent when price cannot narrow the collection", () => {
      const flat = [makeProduct({ handle: "a", price: "20.0" })];
      render(
        <FilterPanel
          view={buildFacetsView(flat, deriveFacets(flat), select())}
          selected={select()}
          basePath={PATH}
          sort="featured"
        />,
      );

      expect(screen.queryByRole("group", { name: "Price range" })).not.toBeInTheDocument();
    });
  });

  describe("on sale", () => {
    it("offers the sale filter with its count", () => {
      renderPanel();

      expect(screen.getByRole("checkbox", { name: "On sale only, 1 product" })).toBeInTheDocument();
    });

    it("puts it in the URL", async () => {
      renderPanel();

      await userEvent.click(screen.getByRole("checkbox", { name: /^On sale only/ }));

      expect(push).toHaveBeenCalledWith(`${PATH}?sale=1`, { scroll: false });
    });

    it("takes it back out", async () => {
      renderPanel(select({ onSale: true }));

      await userEvent.click(screen.getByRole("checkbox", { name: /^On sale only/ }));

      expect(push).toHaveBeenCalledWith(PATH, { scroll: false });
    });

    // Offering it would filter the grid down to nothing.
    it("is absent when nothing is discounted", () => {
      const none = [makeProduct({ handle: "a" }), makeProduct({ handle: "b", price: "500.0" })];
      render(
        <FilterPanel
          view={buildFacetsView(none, deriveFacets(none), select())}
          selected={select()}
          basePath={PATH}
          sort="featured"
        />,
      );

      expect(screen.queryByRole("group", { name: "Availability" })).not.toBeInTheDocument();
    });
  });

  // Two copies of the panel are rendered (sidebar and drawer); sharing input names would
  // make one instance's radios toggle the other's.
  it("scopes its input names to the instance", () => {
    const view = buildFacetsView(products, deriveFacets(products), select());
    const { container } = render(
      <>
        <FilterPanel view={view} selected={select()} basePath={PATH} sort="featured" />
        <FilterPanel view={view} selected={select()} basePath={PATH} sort="featured" />
      </>,
    );

    const names = new Set(
      [...container.querySelectorAll("input[type='radio']")].map((input) =>
        input.getAttribute("name"),
      ),
    );
    expect(names.size).toBe(2);
  });
});
