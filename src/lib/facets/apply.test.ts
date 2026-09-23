import { describe, expect, it } from "vitest";
import { toProductCard } from "@/lib/catalog/mappers";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { makeProduct } from "@/test/products";
import { applyFacets } from "./apply";
import type { SelectedFacets } from "./url";

const NOTHING_SELECTED: SelectedFacets = { options: {}, price: null, onSale: false };

function select(overrides: Partial<SelectedFacets>): SelectedFacets {
  return { ...NOTHING_SELECTED, ...overrides };
}

const handles = (products: { handle: string }[]) => products.map((product) => product.handle);

// moss+M, moss+L, clay+M — enough to tell OR-within from AND-across.
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
    price: "250.0",
    options: [
      { name: "color", values: ["clay"] },
      { name: "size", values: ["M"] },
    ],
  }),
];

describe("applyFacets", () => {
  it("returns every product when nothing is selected", () => {
    expect(applyFacets(catalog, NOTHING_SELECTED)).toStrictEqual(catalog);
  });

  it("returns an empty list for an empty collection", () => {
    expect(applyFacets([], select({ onSale: true }))).toStrictEqual([]);
  });

  it("narrows to one option value", () => {
    const result = applyFacets(catalog, select({ options: { color: ["moss"] } }));

    expect(handles(result)).toStrictEqual(["moss-m", "moss-l"]);
  });

  // Within one axis the values are OR-ed: moss *or* clay.
  it("keeps products matching any value within one axis", () => {
    const result = applyFacets(catalog, select({ options: { color: ["moss", "clay"] } }));

    expect(handles(result)).toStrictEqual(["moss-m", "moss-l", "clay-m"]);
  });

  // Across axes they are AND-ed: moss *and* size M.
  it("requires a match on every selected axis", () => {
    const result = applyFacets(catalog, select({ options: { color: ["moss"], size: ["M"] } }));

    expect(handles(result)).toStrictEqual(["moss-m"]);
  });

  it("returns nothing when the axes cannot be satisfied together", () => {
    const result = applyFacets(catalog, select({ options: { color: ["clay"], size: ["L"] } }));

    expect(result).toStrictEqual([]);
  });

  it("ignores an axis selected with no values", () => {
    expect(applyFacets(catalog, select({ options: { color: [] } }))).toStrictEqual(catalog);
  });

  it("excludes a product that does not offer the selected axis at all", () => {
    const products = [...catalog, makeProduct({ handle: "no-axes", options: [] })];
    const result = applyFacets(products, select({ options: { color: ["moss"] } }));

    expect(handles(result)).toStrictEqual(["moss-m", "moss-l"]);
  });

  it("filters on price with both bounds inclusive", () => {
    const result = applyFacets(catalog, select({ price: { min: 50, max: 150 } }));

    expect(handles(result)).toStrictEqual(["moss-m", "moss-l"]);
  });

  it("returns nothing when no price falls inside the range", () => {
    expect(applyFacets(catalog, select({ price: { min: 300, max: 400 } }))).toStrictEqual([]);
  });

  it("excludes an unpriced product from a price filter", () => {
    const products = [makeProduct({ handle: "unpriced", price: "" })];

    expect(applyFacets(products, select({ price: { min: 0, max: 1000 } }))).toStrictEqual([]);
  });

  it("filters to discounted products", () => {
    expect(handles(applyFacets(catalog, select({ onSale: true })))).toStrictEqual(["moss-l"]);
  });

  it("combines the sale, price and option facets", () => {
    const result = applyFacets(
      catalog,
      select({ options: { color: ["moss"] }, price: { min: 100, max: 200 }, onSale: true }),
    );

    expect(handles(result)).toStrictEqual(["moss-l"]);
  });

  it("preserves the incoming order, because sorting is the API's job", () => {
    const reversed = [...catalog].reverse();
    const result = applyFacets(reversed, select({ options: { size: ["M", "L"] } }));

    expect(handles(result)).toStrictEqual(["clay-m", "moss-l", "moss-m"]);
  });

  it("does not mutate the products it is given", () => {
    const snapshot = structuredClone(catalog);
    applyFacets(catalog, select({ options: { color: ["moss"] } }));

    expect(catalog).toStrictEqual(snapshot);
  });

  it("narrows a real collection to its discounted products", () => {
    const shells = collectionByHandleFixture.collection.products.nodes.map(toProductCard);
    const result = applyFacets(shells, select({ onSale: true }));

    expect(handles(result)).toStrictEqual([
      "waterproof-wading-jacket-with-breathable-shell",
      "oversized-t-shirt",
      "oversized-outerwear-jacket",
    ]);
  });
});
