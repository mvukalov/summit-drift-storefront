import { describe, expect, it } from "vitest";
import { toProductCard } from "@/lib/catalog/mappers";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { makeProduct } from "@/test/products";
import { deriveFacets, type FacetGroups } from "./derive";
import {
  parseFacetsParam,
  serializeFacetsParam,
  type FacetSearchParams,
  type SelectedFacets,
} from "./url";

// Facets from the real shells response: color (slate/moss/clay) × size (XS–L), 25–534, 3 on sale.
const shells = collectionByHandleFixture.collection.products.nodes.map(toProductCard);
const facets = deriveFacets(shells);

const NOTHING_SELECTED: SelectedFacets = { options: {}, price: null, onSale: false };

function parse(params: FacetSearchParams, groups: FacetGroups = facets): SelectedFacets {
  return parseFacetsParam(params, groups);
}

describe("parseFacetsParam", () => {
  it("selects nothing when there are no params", () => {
    expect(parse({})).toStrictEqual(NOTHING_SELECTED);
  });

  it("selects nothing when the collection has no facets", () => {
    expect(parse({ color: "moss", sale: "1" }, deriveFacets([]))).toStrictEqual(NOTHING_SELECTED);
  });

  it("reads a single option value", () => {
    expect(parse({ color: "moss" }).options).toStrictEqual({ color: ["moss"] });
  });

  it("reads comma-separated values on one axis", () => {
    expect(parse({ color: "moss,clay" }).options).toStrictEqual({ color: ["moss", "clay"] });
  });

  it("reads several axes at once", () => {
    expect(parse({ color: "moss", size: "M,L" }).options).toStrictEqual({
      color: ["moss"],
      size: ["M", "L"],
    });
  });

  it("trims whitespace around values", () => {
    expect(parse({ color: " moss , clay " }).options).toStrictEqual({ color: ["moss", "clay"] });
  });

  // `?color=slate,moss` and `?color=moss,slate` are the same filter, so they must parse
  // identically — otherwise they would serialize to two URLs for one page.
  it("orders values by the facet, not by the URL", () => {
    expect(parse({ color: "clay,moss" }).options).toStrictEqual({ color: ["moss", "clay"] });
  });

  it("collapses a repeated value", () => {
    expect(parse({ color: "moss,moss" }).options).toStrictEqual({ color: ["moss"] });
  });

  // A hand-edited or stale URL must still render a full page, never throw or empty the grid.
  it("drops a value the collection does not offer", () => {
    expect(parse({ color: "purple" }).options).toStrictEqual({});
  });

  it("keeps the known values and drops the unknown ones", () => {
    expect(parse({ color: "moss,purple" }).options).toStrictEqual({ color: ["moss"] });
  });

  it("ignores an axis the collection does not have", () => {
    expect(parse({ material: "soft-shell" }).options).toStrictEqual({});
  });

  it("ignores an empty value", () => {
    expect(parse({ color: "", size: ",," }).options).toStrictEqual({});
  });

  it("is case-sensitive, matching the API's own values", () => {
    expect(parse({ color: "Moss", size: "m" }).options).toStrictEqual({});
  });

  // `?color=a&color=b` reaches the page as an array; the comma form is the documented one.
  it("takes the last value of a repeated param", () => {
    expect(parse({ color: ["moss", "clay"] }).options).toStrictEqual({ color: ["clay"] });
  });

  it("reads a price range", () => {
    expect(parse({ price: "100-300" }).price).toStrictEqual({ min: 100, max: 300 });
  });

  it("reads a decimal price range", () => {
    expect(parse({ price: "100.5-300.25" }).price).toStrictEqual({ min: 100.5, max: 300.25 });
  });

  it("clamps a range that reaches past the collection's bounds", () => {
    expect(parse({ price: "0-300" }).price).toStrictEqual({ min: 25, max: 300 });
  });

  it("drops a range that covers the whole span, so the URL stays clean", () => {
    expect(parse({ price: "0-9999" }).price).toBeNull();
  });

  it("drops a range that falls entirely outside the collection", () => {
    expect(parse({ price: "900-1000" }).price).toBeNull();
  });

  it.each([
    ["not a range", "cheap"],
    ["a single number", "100"],
    ["a reversed range", "300-100"],
    ["a negative bound", "-50-100"],
    ["an empty string", ""],
  ])("drops %s", (_label, value) => {
    expect(parse({ price: value }).price).toBeNull();
  });

  it("reads the sale flag", () => {
    expect(parse({ sale: "1" }).onSale).toBe(true);
  });

  it.each(["0", "true", "yes", ""])("ignores sale=%s", (value) => {
    expect(parse({ sale: value }).onSale).toBe(false);
  });

  // Offering the facet with nothing discounted would filter the grid down to nothing.
  it("ignores the sale flag when no product is discounted", () => {
    const groups = deriveFacets([makeProduct({ handle: "full-price" })]);

    expect(parse({ sale: "1" }, groups).onSale).toBe(false);
  });

  it("ignores an axis whose name collides with a reserved param", () => {
    const groups = deriveFacets([
      makeProduct({ handle: "a", options: [{ name: "sort", values: ["price-asc"] }] }),
    ]);

    expect(parse({ sort: "price-asc" }, groups).options).toStrictEqual({});
  });

  it("ignores params belonging to other page state", () => {
    expect(parse({ sort: "price-asc", q: "jacket", page: "2" })).toStrictEqual(NOTHING_SELECTED);
  });

  it("reads every facet together", () => {
    expect(parse({ color: "moss", size: "M", price: "100-300", sale: "1" })).toStrictEqual({
      options: { color: ["moss"], size: ["M"] },
      price: { min: 100, max: 300 },
      onSale: true,
    });
  });
});

describe("serializeFacetsParam", () => {
  it("produces no params when nothing is selected", () => {
    expect(serializeFacetsParam(NOTHING_SELECTED).toString()).toBe("");
  });

  it("joins the values of one axis with commas", () => {
    const params = serializeFacetsParam({ ...NOTHING_SELECTED, options: { color: ["moss"] } });

    expect(params.get("color")).toBe("moss");
  });

  it("writes every facet", () => {
    const params = serializeFacetsParam({
      options: { color: ["moss", "clay"], size: ["M"] },
      price: { min: 100, max: 300 },
      onSale: true,
    });

    expect(params.toString()).toBe("color=moss%2Cclay&size=M&price=100-300&sale=1");
  });

  it("skips an axis selected with no values", () => {
    const params = serializeFacetsParam({ ...NOTHING_SELECTED, options: { color: [] } });

    expect(params.toString()).toBe("");
  });
});

describe("round trip", () => {
  it.each<[string, SelectedFacets]>([
    ["nothing selected", NOTHING_SELECTED],
    ["one option value", { ...NOTHING_SELECTED, options: { color: ["moss"] } }],
    ["several values on one axis", { ...NOTHING_SELECTED, options: { color: ["moss", "clay"] } }],
    ["two axes", { ...NOTHING_SELECTED, options: { color: ["slate"], size: ["XS", "L"] } }],
    ["a price range", { ...NOTHING_SELECTED, price: { min: 100, max: 300 } }],
    ["a decimal price range", { ...NOTHING_SELECTED, price: { min: 100.5, max: 300.25 } }],
    ["the sale flag", { ...NOTHING_SELECTED, onSale: true }],
    [
      "every facet",
      { options: { color: ["moss"], size: ["M"] }, price: { min: 100, max: 300 }, onSale: true },
    ],
  ])("survives serializing and parsing %s", (_label, selected) => {
    const params = Object.fromEntries(serializeFacetsParam(selected));

    expect(parse(params)).toStrictEqual(selected);
  });

  it("survives a trip through a real query string", () => {
    const selected: SelectedFacets = {
      options: { color: ["moss", "clay"], size: ["M"] },
      price: { min: 100, max: 300 },
      onSale: true,
    };
    const url = new URL(`https://example.com/?${serializeFacetsParam(selected)}`);

    expect(parse(Object.fromEntries(url.searchParams))).toStrictEqual(selected);
  });
});
