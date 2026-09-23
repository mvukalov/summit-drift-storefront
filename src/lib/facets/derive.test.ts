import { describe, expect, it } from "vitest";
import { toProductCard } from "@/lib/catalog/mappers";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { makeProduct } from "@/test/products";
import { deriveFacets } from "./derive";

// The real Summit Protection Shells response: 8 products, colour × size, 3 on sale.
const shells = collectionByHandleFixture.collection.products.nodes.map(toProductCard);

describe("deriveFacets", () => {
  it("returns empty facets for a collection with no products", () => {
    expect(deriveFacets([])).toStrictEqual({ options: [], price: null, saleCount: 0 });
  });

  // A shared constant would hand every caller the same mutable arrays; in a long-lived
  // server one caller's mutation would then leak into later requests.
  it("returns a fresh object for each empty collection", () => {
    const first = deriveFacets([]);

    expect(first).not.toBe(deriveFacets([]));
    expect(first.options).not.toBe(deriveFacets([]).options);
  });

  it("derives the axes a real collection uses, with labels", () => {
    const { options } = deriveFacets(shells);

    expect(options.map((option) => [option.name, option.label])).toStrictEqual([
      ["color", "Color"],
      ["size", "Size"],
    ]);
  });

  // A hard-coded colour/size pair would leave this collection with one usable facet.
  it("derives material as an axis when that is what the products offer", () => {
    const products = [
      makeProduct({
        handle: "joggers",
        options: [
          { name: "material", values: ["nylon-blend", "soft-shell"] },
          { name: "size", values: ["30", "32"] },
        ],
      }),
    ];

    expect(deriveFacets(products).options.map((option) => option.label)).toStrictEqual([
      "Material",
      "Size",
    ]);
  });

  it("counts each product once per value it offers", () => {
    const products = [
      makeProduct({ handle: "a", options: [{ name: "color", values: ["moss", "slate"] }] }),
      makeProduct({ handle: "b", options: [{ name: "color", values: ["moss"] }] }),
      makeProduct({ handle: "c", options: [{ name: "color", values: ["clay"] }] }),
    ];

    expect(deriveFacets(products).options[0]?.values).toStrictEqual([
      { value: "moss", label: "Moss", count: 2 },
      { value: "slate", label: "Slate", count: 1 },
      { value: "clay", label: "Clay", count: 1 },
    ]);
  });

  // Every shells product offers all three colours and all four sizes.
  it("counts every product in the real collection against each value", () => {
    const { options } = deriveFacets(shells);
    const counts = options.flatMap((option) => option.values.map((value) => value.count));

    expect(counts.every((count) => count === shells.length)).toBe(true);
  });

  it("does not count a product twice when the API repeats a value", () => {
    const products = [
      makeProduct({ handle: "a", options: [{ name: "color", values: ["moss", "moss"] }] }),
    ];

    expect(deriveFacets(products).options[0]?.values).toStrictEqual([
      { value: "moss", label: "Moss", count: 1 },
    ]);
  });

  // Sorting would turn XS, S, M, L into L, M, S, XS — meaningless for a size facet.
  it("keeps the API's value order instead of sorting", () => {
    const sizes = deriveFacets(shells).options.find((option) => option.name === "size");

    expect(sizes?.values.map((value) => value.value)).toStrictEqual(["XS", "S", "M", "L"]);
    expect(sizes?.values.map((value) => value.label)).toStrictEqual(["XS", "S", "M", "L"]);
  });

  it("derives the price bounds and currency from the products", () => {
    const products = [
      makeProduct({ handle: "a", price: "75.0" }),
      makeProduct({ handle: "b", price: "25.5" }),
      makeProduct({ handle: "c", price: "147.0" }),
    ];

    expect(deriveFacets(products).price).toStrictEqual({
      min: 25.5,
      max: 147,
      currencyCode: "USD",
    });
  });

  it("reports min === max when every product costs the same", () => {
    const products = [
      makeProduct({ handle: "a", price: "64.0" }),
      makeProduct({ handle: "b", price: "64.0" }),
    ];

    expect(deriveFacets(products).price).toMatchObject({ min: 64, max: 64 });
  });

  it("has no price facet when no price parses", () => {
    expect(deriveFacets([makeProduct({ handle: "a", price: "" })]).price).toBeNull();
  });

  it("counts the discounted products", () => {
    expect(deriveFacets(shells).saleCount).toBe(3);
  });

  it("reports no sale facet when nothing is discounted", () => {
    expect(deriveFacets([makeProduct({ handle: "a" })]).saleCount).toBe(0);
  });

  it("derives a single-value axis for a one-colour collection", () => {
    const products = [
      makeProduct({ handle: "a", options: [{ name: "color", values: ["stone"] }] }),
      makeProduct({ handle: "b", options: [{ name: "color", values: ["stone"] }] }),
    ];

    expect(deriveFacets(products).options).toStrictEqual([
      { name: "color", label: "Color", values: [{ value: "stone", label: "Stone", count: 2 }] },
    ]);
  });

  it("returns no option facets for products without options", () => {
    expect(deriveFacets([makeProduct({ handle: "a", options: [] })]).options).toStrictEqual([]);
  });
});
