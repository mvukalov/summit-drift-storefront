import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFacetsView } from "@/lib/facets/counts";
import { deriveFacets } from "@/lib/facets/derive";
import type { SelectedFacets } from "@/lib/facets/url";
import { makeProduct } from "@/test/products";
import { CollectionToolbar } from "./CollectionToolbar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const PATH = "/collections/summit-protection-shells";

const products = [
  makeProduct({
    handle: "moss-m",
    price: "50.0",
    isOnSale: true,
    options: [
      { name: "color", values: ["moss"] },
      { name: "size", values: ["M"] },
    ],
  }),
  makeProduct({
    handle: "clay-l",
    price: "300.0",
    options: [
      { name: "color", values: ["clay"] },
      { name: "size", values: ["L"] },
    ],
  }),
];

function select(overrides: Partial<SelectedFacets> = {}): SelectedFacets {
  return { options: {}, price: null, onSale: false, ...overrides };
}

function renderToolbar(selected = select(), resultCount = products.length) {
  render(
    <CollectionToolbar
      view={buildFacetsView(products, deriveFacets(products), selected)}
      selected={selected}
      sort="featured"
      basePath={PATH}
      resultCount={resultCount}
    />,
  );
}

function chips() {
  return screen.getByRole("list", { name: "Active filters" });
}

beforeEach(() => {
  push.mockClear();
});

describe("CollectionToolbar", () => {
  describe("count", () => {
    it("reports the products left after filtering, not the collection total", () => {
      renderToolbar(select({ options: { color: ["moss"] } }), 1);

      expect(screen.getByText("1 product")).toBeVisible();
    });

    it("uses the plural for several", () => {
      renderToolbar();

      expect(screen.getByText("2 products")).toBeVisible();
    });

    // Screen-reader users get no visual cue that the grid changed under them.
    it("announces the new count politely", () => {
      renderToolbar();

      expect(screen.getByText("2 products")).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("chips", () => {
    it("renders none while nothing is filtered", () => {
      renderToolbar();

      expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
    });

    it("renders one per active filter", () => {
      renderToolbar(select({ options: { color: ["moss"], size: ["M"] }, onSale: true }));

      expect(
        within(chips())
          .getAllByRole("button")
          .map((chip) => chip.textContent),
      ).toStrictEqual(["Moss", "Size M", "On sale"]);
    });

    it("removes only its own filter", async () => {
      renderToolbar(select({ options: { color: ["moss"], size: ["M"] } }));

      await userEvent.click(screen.getByRole("button", { name: "Moss, remove filter" }));

      expect(push).toHaveBeenCalledWith(`${PATH}?size=M`, { scroll: false });
    });

    it("removes the price filter", async () => {
      renderToolbar(select({ price: { min: 150, max: 300 } }));

      await userEvent.click(screen.getByRole("button", { name: /remove filter$/ }));

      expect(push).toHaveBeenCalledWith(PATH, { scroll: false });
    });

    it("removes the sale filter", async () => {
      renderToolbar(select({ onSale: true, options: { color: ["moss"] } }));

      await userEvent.click(screen.getByRole("button", { name: "On sale, remove filter" }));

      expect(push).toHaveBeenCalledWith(`${PATH}?color=moss`, { scroll: false });
    });

    it("clears every filter at once", async () => {
      renderToolbar(select({ options: { color: ["moss"] }, onSale: true }));

      await userEvent.click(screen.getByRole("button", { name: "Clear all" }));

      expect(push).toHaveBeenCalledWith(PATH, { scroll: false });
    });
  });

  // A chip deletes itself from the DOM; without this, focus falls to <body> and a keyboard
  // user is stranded at the top of the document after every removal.
  describe("focus", () => {
    it("moves focus to the count when a chip is removed", async () => {
      renderToolbar(select({ options: { color: ["moss"] } }), 1);

      await userEvent.click(screen.getByRole("button", { name: "Moss, remove filter" }));

      expect(screen.getByText("1 product")).toHaveFocus();
    });

    it("moves focus to the count when everything is cleared", async () => {
      renderToolbar(select({ options: { color: ["moss"] } }), 1);

      await userEvent.click(screen.getByRole("button", { name: "Clear all" }));

      expect(screen.getByText("1 product")).toHaveFocus();
    });
  });

  it("puts sort in the same toolbar and keeps the filters when it changes", async () => {
    renderToolbar(select({ options: { color: ["moss"] } }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort:" }), "price-asc");

    expect(push).toHaveBeenCalledWith(`${PATH}?color=moss&sort=price-asc`, { scroll: false });
  });
});
