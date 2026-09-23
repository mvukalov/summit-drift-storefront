import { describe, expect, it } from "vitest";
import {
  clearFacets,
  collectionHref,
  countActiveFacets,
  hasActiveFacets,
  selectPriceRange,
  setOnSale,
  toggleOptionValue,
} from "./query";
import type { SelectedFacets } from "./url";

const PATH = "/collections/summit-protection-shells";

function select(overrides: Partial<SelectedFacets> = {}): SelectedFacets {
  return { options: {}, price: null, onSale: false, ...overrides };
}

describe("toggleOptionValue", () => {
  it("adds a value to an axis that has none", () => {
    expect(toggleOptionValue(select(), "color", "moss").options).toStrictEqual({ color: ["moss"] });
  });

  // Values within one axis are OR-ed (§5.1), so a second colour joins the first.
  it("adds a second value to the same axis", () => {
    const selected = select({ options: { color: ["moss"] } });

    expect(toggleOptionValue(selected, "color", "clay").options).toStrictEqual({
      color: ["moss", "clay"],
    });
  });

  it("removes a value that was already selected", () => {
    const selected = select({ options: { color: ["moss", "clay"] } });

    expect(toggleOptionValue(selected, "color", "moss").options).toStrictEqual({ color: ["clay"] });
  });

  // An empty axis would serialize to `?color=` and clutter a shared URL.
  it("drops the axis entirely when its last value goes", () => {
    const selected = select({ options: { color: ["moss"], size: ["M"] } });

    expect(toggleOptionValue(selected, "color", "moss").options).toStrictEqual({ size: ["M"] });
  });

  it("leaves the other facets untouched", () => {
    const selected = select({ options: { size: ["M"] }, onSale: true, price: { min: 1, max: 2 } });
    const next = toggleOptionValue(selected, "color", "moss");

    expect(next.onSale).toBe(true);
    expect(next.price).toStrictEqual({ min: 1, max: 2 });
    expect(next.options.size).toStrictEqual(["M"]);
  });

  // The selection comes from a server render and is shared by the sidebar, the drawer and
  // the chips row, so a mutation would corrupt all three.
  it("does not mutate its input", () => {
    const selected = select({ options: { color: ["moss"] } });

    toggleOptionValue(selected, "color", "clay");

    expect(selected.options).toStrictEqual({ color: ["moss"] });
  });
});

describe("selectPriceRange", () => {
  it("sets the range", () => {
    expect(selectPriceRange(select(), { min: 50, max: 150 }).price).toStrictEqual({
      min: 50,
      max: 150,
    });
  });

  it("clears the range with null", () => {
    expect(selectPriceRange(select({ price: { min: 50, max: 150 } }), null).price).toBeNull();
  });
});

describe("setOnSale", () => {
  it.each([true, false])("sets the sale flag to %s", (value) => {
    expect(setOnSale(select({ onSale: !value }), value).onSale).toBe(value);
  });
});

describe("clearFacets", () => {
  it("returns an unfiltered selection", () => {
    expect(clearFacets()).toStrictEqual({ options: {}, price: null, onSale: false });
  });

  // A shared constant would hand every caller the same mutable object.
  it("returns a fresh object each time", () => {
    expect(clearFacets()).not.toBe(clearFacets());
  });
});

describe("hasActiveFacets", () => {
  it.each([
    ["nothing selected", select(), false],
    ["an option value", select({ options: { color: ["moss"] } }), true],
    ["a price range", select({ price: { min: 1, max: 2 } }), true],
    ["the sale filter", select({ onSale: true }), true],
    ["an axis left empty", select({ options: { color: [] } }), false],
  ])("is %s → %s", (_label, selected, expected) => {
    expect(hasActiveFacets(selected)).toBe(expected);
  });
});

describe("countActiveFacets", () => {
  it("counts each selected value, the price range and the sale filter", () => {
    const selected = select({
      options: { color: ["moss", "clay"], size: ["M"] },
      price: { min: 1, max: 2 },
      onSale: true,
    });

    expect(countActiveFacets(selected)).toBe(5);
  });

  it("is zero for an unfiltered collection", () => {
    expect(countActiveFacets(select())).toBe(0);
  });
});

describe("collectionHref", () => {
  it("returns the bare path when nothing is filtered or sorted", () => {
    expect(collectionHref(PATH, select(), "featured")).toBe(PATH);
  });

  it("puts the facets first and the sort last", () => {
    const selected = select({ options: { color: ["moss"] }, onSale: true });

    expect(collectionHref(PATH, selected, "price-asc")).toBe(
      `${PATH}?color=moss&sale=1&sort=price-asc`,
    );
  });

  // Commas are legal unencoded in a query value, and §5.1's URLs show them that way.
  it("keeps multi-value axes readable", () => {
    const selected = select({ options: { color: ["moss", "clay"] } });

    expect(collectionHref(PATH, selected, "featured")).toBe(`${PATH}?color=moss,clay`);
  });

  it("writes a price range as min-max", () => {
    const selected = select({ price: { min: 50, max: 149.99 } });

    expect(collectionHref(PATH, selected, "featured")).toBe(`${PATH}?price=50-149.99`);
  });

  // The default sort is the absence of the param, so a shared URL stays clean.
  it("omits the default sort", () => {
    expect(collectionHref(PATH, select({ onSale: true }), "featured")).toBe(`${PATH}?sale=1`);
  });

  it("keeps the sort when the facets are cleared", () => {
    expect(collectionHref(PATH, clearFacets(), "price-desc")).toBe(`${PATH}?sort=price-desc`);
  });
});
