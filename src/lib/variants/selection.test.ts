import { describe, expect, it } from "vitest";
import type { ProductOption, ProductVariant } from "@/types/catalog";
import {
  findExactVariant,
  isOptionValueAvailable,
  parseVariantSelection,
  productHref,
  resolveVariant,
  selectOptionValue,
  selectionFromVariant,
} from "./selection";

const OPTIONS: ProductOption[] = [
  { name: "color", values: ["slate", "moss"] },
  { name: "size", values: ["XS", "M"] },
];

function variant(color: string, size: string, availableForSale = true): ProductVariant {
  return {
    id: `gid://shopify/ProductVariant/${color}-${size}`,
    title: `${color} / ${size}`,
    sku: `SKU-${color}-${size}`,
    availableForSale,
    selectedOptions: [
      { name: "color", value: color },
      { name: "size", value: size },
    ],
    price: { amount: "249.0", currencyCode: "USD" },
    compareAtPrice: null,
    image: null,
  };
}

// The full 2×2 matrix, in the order the API returns it.
const VARIANTS: ProductVariant[] = [
  variant("slate", "XS"),
  variant("slate", "M"),
  variant("moss", "XS"),
  variant("moss", "M"),
];

describe("parseVariantSelection", () => {
  it("reads one value per axis", () => {
    expect(parseVariantSelection({ color: "moss", size: "M" }, OPTIONS)).toStrictEqual({
      color: "moss",
      size: "M",
    });
  });

  it("keeps a partial selection, which is what a half-specified shared link looks like", () => {
    expect(parseVariantSelection({ color: "moss" }, OPTIONS)).toStrictEqual({ color: "moss" });
  });

  // A stale link must still render the product rather than 404.
  it.each([
    ["a value the axis does not list", { color: "purple" }],
    ["an axis the product does not have", { material: "nylon-blend" }],
    ["nothing at all", {}],
  ])("drops %s", (_label, params) => {
    expect(parseVariantSelection(params, OPTIONS)).toStrictEqual({});
  });

  it("is case sensitive, matching the raw API value as facets do", () => {
    expect(parseVariantSelection({ size: "xs" }, OPTIONS)).toStrictEqual({});
    expect(parseVariantSelection({ size: "XS" }, OPTIONS)).toStrictEqual({ size: "XS" });
  });

  it("takes the last of a repeated param", () => {
    expect(parseVariantSelection({ color: ["slate", "moss"] }, OPTIONS)).toStrictEqual({
      color: "moss",
    });
  });
});

describe("selectionFromVariant", () => {
  it("reads a variant's own options back out as a selection", () => {
    expect(selectionFromVariant(variant("moss", "M"))).toStrictEqual({
      color: "moss",
      size: "M",
    });
  });

  it("round-trips through findExactVariant", () => {
    const target = variant("moss", "XS");

    expect(findExactVariant(VARIANTS, selectionFromVariant(target))?.id).toBe(target.id);
  });
});

describe("findExactVariant", () => {
  it("finds the variant matching every axis", () => {
    expect(findExactVariant(VARIANTS, { color: "moss", size: "M" })?.title).toBe("moss / M");
  });

  it("returns null for a partial selection, which identifies no single variant", () => {
    expect(findExactVariant(VARIANTS, { color: "moss" })).toBeNull();
  });

  it("returns null for a combination the product does not offer", () => {
    expect(findExactVariant([variant("slate", "XS")], { color: "moss", size: "M" })).toBeNull();
  });
});

describe("resolveVariant", () => {
  it("returns the exact match when the selection is complete", () => {
    expect(resolveVariant(VARIANTS, { color: "moss", size: "M" })?.title).toBe("moss / M");
  });

  it("fills the unchosen axes from the first variant that fits", () => {
    expect(resolveVariant(VARIANTS, { color: "moss" })?.title).toBe("moss / XS");
  });

  it("falls back to the product default when nothing matches", () => {
    expect(resolveVariant(VARIANTS, { color: "purple", size: "XXL" })?.title).toBe("slate / XS");
  });

  it("defaults to the first variant when nothing is selected", () => {
    expect(resolveVariant(VARIANTS, {})?.title).toBe("slate / XS");
  });

  it("prefers a purchasable variant over an earlier sold-out one", () => {
    const soldOutFirst = [variant("slate", "XS", false), variant("slate", "M", true)];

    expect(resolveVariant(soldOutFirst, { color: "slate" })?.title).toBe("slate / M");
  });

  it("still returns a variant when every one is sold out, so the page can render", () => {
    const allSoldOut = [variant("slate", "XS", false), variant("slate", "M", false)];

    expect(resolveVariant(allSoldOut, {})?.title).toBe("slate / XS");
  });

  it("returns null only when the product has no variants", () => {
    expect(resolveVariant([], { color: "moss" })).toBeNull();
  });
});

// This catalog has no unavailable variant (0 of 360, verified 2026-09-23), so these are the
// only tests that exercise the disabled-combination path.
describe("isOptionValueAvailable", () => {
  const partlySoldOut = [
    variant("slate", "XS", true),
    variant("slate", "M", false),
    variant("moss", "XS", false),
    variant("moss", "M", true),
  ];

  it("is true when the combination exists and is in stock", () => {
    expect(isOptionValueAvailable(partlySoldOut, { size: "XS" }, "color", "slate")).toBe(true);
  });

  it("is false when the combination exists but is sold out", () => {
    expect(isOptionValueAvailable(partlySoldOut, { size: "XS" }, "color", "moss")).toBe(false);
  });

  it("re-evaluates as the other axes change", () => {
    // moss is sold out in XS but available in M.
    expect(isOptionValueAvailable(partlySoldOut, { size: "M" }, "color", "moss")).toBe(true);
  });

  it("replaces the value already chosen on the same axis rather than conflicting with it", () => {
    expect(
      isOptionValueAvailable(partlySoldOut, { color: "slate", size: "XS" }, "color", "moss"),
    ).toBe(false);
  });

  it("is false for a combination the product does not offer", () => {
    expect(isOptionValueAvailable(VARIANTS, {}, "color", "purple")).toBe(false);
  });

  it("ignores stock on other axes when nothing else is chosen", () => {
    expect(isOptionValueAvailable(partlySoldOut, {}, "color", "moss")).toBe(true);
  });
});

describe("productHref", () => {
  it("writes every axis out, so the link is unambiguous", () => {
    expect(productHref("jacket", { color: "moss", size: "M" })).toBe(
      "/products/jacket?color=moss&size=M",
    );
  });

  it("produces the same URL regardless of the order the axes were chosen in", () => {
    expect(productHref("jacket", { size: "M", color: "moss" })).toBe(
      productHref("jacket", { color: "moss", size: "M" }),
    );
  });

  it("leaves the URL bare when nothing is selected", () => {
    expect(productHref("jacket", {})).toBe("/products/jacket");
  });

  it("encodes values that need it", () => {
    expect(productHref("jacket", { material: "nylon blend" })).toBe(
      "/products/jacket?material=nylon+blend",
    );
  });

  it("round-trips back through the parser", () => {
    const href = productHref("jacket", { color: "moss", size: "M" });
    const params = Object.fromEntries(new URL(href, "https://example.com").searchParams);

    expect(parseVariantSelection(params, OPTIONS)).toStrictEqual({ color: "moss", size: "M" });
  });
});

describe("selectOptionValue", () => {
  it("sets a value on an unchosen axis without touching the others", () => {
    expect(selectOptionValue({ color: "moss" }, "size", "M")).toStrictEqual({
      color: "moss",
      size: "M",
    });
  });

  it("replaces the value on an axis that already had one", () => {
    expect(selectOptionValue({ color: "moss" }, "color", "slate")).toStrictEqual({
      color: "slate",
    });
  });

  it("does not mutate its input, which is reused across a render", () => {
    const selection = { color: "moss" };
    selectOptionValue(selection, "size", "M");

    expect(selection).toStrictEqual({ color: "moss" });
  });
});
