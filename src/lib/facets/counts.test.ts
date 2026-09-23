import { describe, expect, it } from "vitest";
import { toProductCard } from "@/lib/catalog/mappers";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { makeProduct } from "@/test/products";
import { buildFacetsView } from "./counts";
import { deriveFacets } from "./derive";
import type { SelectedFacets } from "./url";

// The real Summit Protection Shells response: 8 products, color × size, 3 on sale.
const shells = collectionByHandleFixture.collection.products.nodes.map(toProductCard);

function select(overrides: Partial<SelectedFacets> = {}): SelectedFacets {
  return { options: {}, price: null, onSale: false, ...overrides };
}

function view(products = shells, selected = select()) {
  return buildFacetsView(products, deriveFacets(products), selected);
}

function countsFor(axis: string, products = shells, selected = select()) {
  const facet = view(products, selected).options.find((option) => option.name === axis);
  return Object.fromEntries(facet?.values.map((value) => [value.value, value.count]) ?? []);
}

// moss+M(50), moss+L(150, on sale), clay+M(300): enough to tell the axes apart.
const catalog = [
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

describe("buildFacetsView", () => {
  it("offers every axis the collection has, with its labels", () => {
    expect(view().options.map((option) => [option.name, option.label])).toStrictEqual([
      ["color", "Color"],
      ["size", "Size"],
    ]);
  });

  it("returns nothing to filter for an empty collection", () => {
    expect(view([])).toStrictEqual({ options: [], price: [], sale: null, active: [] });
  });

  describe("counts", () => {
    it("counts the whole collection when nothing is selected", () => {
      expect(countsFor("color", catalog)).toStrictEqual({ moss: 2, clay: 1 });
      expect(countsFor("size", catalog)).toStrictEqual({ M: 2, L: 1 });
    });

    // §5.1: a count says how many products remain if this value is added to the selection.
    it("narrows the other axes by the active selection", () => {
      const selected = select({ options: { color: ["moss"] } });

      expect(countsFor("size", catalog, selected)).toStrictEqual({ M: 1, L: 1 });
    });

    // Otherwise choosing Moss would zero Slate and Clay and there would be no way back.
    it("keeps an axis counting against everything but its own selection", () => {
      const selected = select({ options: { color: ["moss"] } });

      expect(countsFor("color", catalog, selected)).toStrictEqual({ moss: 2, clay: 1 });
    });

    it("narrows the option counts by an active sale filter", () => {
      const selected = select({ onSale: true });

      expect(countsFor("color", catalog, selected)).toStrictEqual({ moss: 1, clay: 0 });
    });

    it("narrows the option counts by an active price range", () => {
      const selected = select({ price: { min: 0, max: 200 } });

      expect(countsFor("color", catalog, selected)).toStrictEqual({ moss: 2, clay: 0 });
    });

    it("marks the selected values", () => {
      const selected = select({ options: { color: ["moss"] } });
      const colors = view(catalog, selected).options[0]?.values ?? [];

      expect(colors.filter((value) => value.selected).map((value) => value.value)).toStrictEqual([
        "moss",
      ]);
    });
  });

  describe("color dots", () => {
    it("gives the color axis a CSS color per value", () => {
      const colors = view(catalog).options[0]?.values ?? [];

      expect(colors.map((value) => value.color)).toStrictEqual(["#4f5d3a", "#b5623f"]);
    });

    it("leaves textual axes without a dot", () => {
      const sizes = view(catalog).options[1]?.values ?? [];

      expect(sizes.every((value) => value.color === null)).toBe(true);
    });

    it("falls back to the label alone for a color the map does not know", () => {
      const products = [
        makeProduct({ handle: "a", options: [{ name: "color", values: ["ultraviolet"] }] }),
      ];

      expect(view(products).options[0]?.values[0]?.color).toBeNull();
    });
  });

  describe("price buckets", () => {
    it("cuts the collection's span into labelled buckets, clamped to its own bounds", () => {
      expect(
        view(catalog).price.map((bucket) => [bucket.label, bucket.min, bucket.max, bucket.count]),
      ).toStrictEqual([
        // The collection starts at $50, so "Under $50" clamps to an empty span and goes.
        ["$50 – $150", 50, 149.99, 1],
        ["$150+", 150, 300, 2],
      ]);
    });

    it("drops a bucket no product falls into", () => {
      const products = [
        makeProduct({ handle: "cheap", price: "20.0" }),
        makeProduct({ handle: "mid", price: "80.0" }),
      ];

      expect(view(products).price.map((bucket) => bucket.label)).toStrictEqual([
        "Under $50",
        "$50 – $150",
      ]);
    });

    // One bucket holding everything cannot narrow anything, so the group is noise.
    it("offers no buckets when they would all hold the same products", () => {
      const products = [
        makeProduct({ handle: "a", price: "20.0" }),
        makeProduct({ handle: "b", price: "30.0" }),
      ];

      expect(view(products).price).toStrictEqual([]);
    });

    it("offers no buckets for a collection with no prices", () => {
      const products = [makeProduct({ handle: "a", price: "" })];

      expect(view(products).price).toStrictEqual([]);
    });

    // A product priced exactly on a boundary must not be counted in both neighbours.
    it("never counts a product in two buckets", () => {
      const products = [
        makeProduct({ handle: "at-50", price: "50.0" }),
        makeProduct({ handle: "at-150", price: "150.0" }),
        makeProduct({ handle: "at-300", price: "300.0" }),
      ];
      const buckets = view(products).price;

      expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(products.length);
    });

    // Otherwise the sidebar loses the control that set the filter in the first place.
    it("keeps the selected bucket even once the other facets empty it", () => {
      const selected = select({ options: { color: ["clay"] }, price: { min: 50, max: 149.99 } });
      const buckets = view(catalog, selected).price;

      expect(buckets.map((bucket) => [bucket.label, bucket.count, bucket.selected])).toContainEqual(
        ["$50 – $150", 0, true],
      );
    });

    it("keeps the group for an active range even when it can no longer narrow", () => {
      const products = [
        makeProduct({ handle: "a", price: "20.0" }),
        makeProduct({ handle: "b", price: "30.0" }),
      ];
      const selected = select({ price: { min: 20, max: 25 } });

      expect(view(products, selected).price.length).toBeGreaterThan(0);
    });

    it("marks the bucket the URL selected", () => {
      const selected = select({ price: { min: 150, max: 300 } });

      expect(
        view(catalog, selected)
          .price.filter((bucket) => bucket.selected)
          .map((bucket) => bucket.label),
      ).toStrictEqual(["$150+"]);
    });

    it("counts buckets against the other facets, not the current price", () => {
      const selected = select({ options: { color: ["moss"] }, price: { min: 150, max: 300 } });

      expect(view(catalog, selected).price.map((bucket) => bucket.count)).toStrictEqual([1, 1]);
    });
  });

  describe("sale facet", () => {
    it("counts the discounted products", () => {
      expect(view(catalog).sale).toStrictEqual({ count: 1, selected: false });
    });

    // Offering it would filter the grid down to nothing.
    it("is absent when nothing is discounted", () => {
      expect(view([makeProduct({ handle: "a" })]).sale).toBeNull();
    });

    it("counts against the other facets while it is active", () => {
      const selected = select({ options: { color: ["clay"] }, onSale: true });

      expect(view(catalog, selected).sale).toStrictEqual({ count: 0, selected: true });
    });
  });

  describe("active filters", () => {
    it("is empty when nothing is selected", () => {
      expect(view(catalog).active).toStrictEqual([]);
    });

    // "Moss" reads on its own; "M" does not, so its chip carries the axis.
    it("labels a chip per selected value, prefixing abbreviations with the axis", () => {
      const selected = select({ options: { color: ["moss"], size: ["M"] } });

      expect(view(catalog, selected).active).toStrictEqual([
        { id: "color:moss", label: "Moss", kind: "option", name: "color", value: "moss" },
        { id: "size:M", label: "Size M", kind: "option", name: "size", value: "M" },
      ]);
    });

    it("names the price chip after the bucket it matches", () => {
      const selected = select({ price: { min: 150, max: 300 } });

      expect(view(catalog, selected).active).toStrictEqual([
        { id: "price", label: "$150+", kind: "price" },
      ]);
    });

    // A hand-edited `?price=60-90` is valid but matches no bucket.
    it("falls back to the range itself when it matches no bucket", () => {
      const selected = select({ price: { min: 60, max: 90 } });

      expect(view(catalog, selected).active[0]?.label).toBe("$60 – $90");
    });

    it("adds a chip for the sale filter", () => {
      expect(view(catalog, select({ onSale: true })).active).toStrictEqual([
        { id: "sale", label: "On sale", kind: "sale" },
      ]);
    });
  });

  it("does not mutate the selection it is given", () => {
    const selected = select({ options: { color: ["moss"] }, onSale: true });

    view(catalog, selected);

    expect(selected).toStrictEqual({
      options: { color: ["moss"] },
      price: null,
      onSale: true,
    });
  });
});
