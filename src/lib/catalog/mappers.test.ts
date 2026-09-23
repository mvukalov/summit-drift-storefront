import { describe, expect, it } from "vitest";
import type { ProductCardFragment } from "@/lib/graphql/generated/graphql";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { collectionsFixture } from "@/test/msw/fixtures/collections";
import { mainMenuFixture } from "@/test/msw/fixtures/mainMenu";
import { productByHandleFixture } from "@/test/msw/fixtures/productByHandle";
import {
  toCollectionSummary,
  toMenuItem,
  toProductCard,
  toProductDetail,
  toProductVariant,
} from "./mappers";

const products = collectionByHandleFixture.collection.products.nodes;

function productByHandle(handle: string): ProductCardFragment {
  const product = products.find((node) => node.handle === handle);
  if (!product) throw new Error(`Fixture has no product "${handle}"`);
  return product;
}

describe("toCollectionSummary", () => {
  it("maps a collection to its summary", () => {
    const [first] = collectionsFixture.collections.nodes;
    if (!first) throw new Error("Fixture has no collections");

    // toStrictEqual: GraphQL's __typename must not leak into domain objects.
    expect(toCollectionSummary(first)).toStrictEqual({
      handle: "summit-protection-shells",
      title: "Summit Protection Shells",
      description: first.description,
      image: { url: first.image?.url, altText: null, width: null, height: null },
    });
  });

  it("maps a missing image to null", () => {
    const [first] = collectionsFixture.collections.nodes;
    if (!first) throw new Error("Fixture has no collections");

    expect(toCollectionSummary({ ...first, image: null }).image).toBeNull();
  });
});

describe("toProductCard", () => {
  it("marks a discounted product as on sale with its compare-at price", () => {
    const product = productByHandle("waterproof-wading-jacket-with-breathable-shell");
    const card = toProductCard(product);

    // toStrictEqual: GraphQL's __typename must not leak into domain objects.
    expect(card).toStrictEqual({
      handle: "waterproof-wading-jacket-with-breathable-shell",
      title: product.title,
      options: [
        { name: "color", values: ["slate", "moss", "clay"] },
        { name: "size", values: ["XS", "S", "M", "L"] },
      ],
      image: {
        url: product.featuredImage?.url,
        altText: product.featuredImage?.altText,
        width: product.featuredImage?.width,
        height: product.featuredImage?.height,
      },
      isOnSale: true,
      price: { amount: "249.0", currencyCode: "USD" },
      compareAtPrice: { amount: "323.7", currencyCode: "USD" },
    });
  });

  it("does not mark a full-price product as on sale", () => {
    const card = toProductCard(productByHandle("oversized-technical-nylon-jacket"));

    expect(card).toMatchObject({
      isOnSale: false,
      price: { amount: "485.0", currencyCode: "USD" },
      compareAtPrice: null,
    });
  });

  it("finds three products on sale in the shells collection", () => {
    const onSale = products.map(toProductCard).filter((card) => card.isOnSale);

    expect(onSale.map((card) => card.handle)).toEqual([
      "waterproof-wading-jacket-with-breathable-shell",
      "oversized-t-shirt",
      "oversized-outerwear-jacket",
    ]);
  });

  it("falls back to the highest compare-at price when only some variants are discounted", () => {
    const base = productByHandle("oversized-technical-nylon-jacket");
    const card = toProductCard({
      ...base,
      priceRange: {
        ...base.priceRange,
        minVariantPrice: { ...base.priceRange.minVariantPrice, amount: "100.0" },
      },
      compareAtPriceRange: {
        ...base.compareAtPriceRange,
        minVariantPrice: { ...base.compareAtPriceRange.minVariantPrice, amount: "0.0" },
        maxVariantPrice: { ...base.compareAtPriceRange.maxVariantPrice, amount: "150.0" },
      },
    });

    expect(card.isOnSale).toBe(true);
    expect(card.compareAtPrice?.amount).toBe("150.0");
  });

  // Facets are derived from these option axes, so they have to survive the mapping
  // in the API's own order — the values read XS, S, M, L, never sorted.
  it("keeps the API's option order and drops __typename", () => {
    const card = toProductCard(productByHandle("oversized-t-shirt"));

    expect(card.options).toStrictEqual([
      { name: "color", values: ["slate", "moss", "clay"] },
      { name: "size", values: ["XS", "S", "M", "L"] },
    ]);
  });

  it("maps a missing featured image to null", () => {
    const card = toProductCard({ ...productByHandle("oversized-t-shirt"), featuredImage: null });

    expect(card.image).toBeNull();
  });
});

describe("toMenuItem", () => {
  const [home, shells] = mainMenuFixture.menu.items;
  if (!home || !shells) throw new Error("Fixture has too few menu items");

  it("turns the absolute storefront URL into a site-relative path", () => {
    // toStrictEqual: GraphQL's __typename and the item type must not leak into domain objects.
    expect(toMenuItem(shells)).toStrictEqual({
      title: "Summit Protection Shells",
      href: "/collections/summit-protection-shells",
    });
  });

  it("maps the storefront root to /", () => {
    expect(toMenuItem(home)?.href).toBe("/");
  });

  it("drops the query string and fragment", () => {
    expect(toMenuItem({ ...shells, url: `${shells.url}?sort=price#grid` })?.href).toBe(
      "/collections/summit-protection-shells",
    );
  });

  it("returns null for an item without a URL", () => {
    expect(toMenuItem({ ...shells, url: null })).toBeNull();
  });
});

describe("toProductVariant", () => {
  const [variant] = productByHandleFixture.product.variants.nodes;
  if (!variant) throw new Error("Fixture has no variants");

  it("maps a variant without leaking __typename", () => {
    expect(toProductVariant(variant)).toStrictEqual({
      id: variant.id,
      title: "slate / XS",
      sku: variant.sku,
      availableForSale: true,
      selectedOptions: [
        { name: "color", value: "slate" },
        { name: "size", value: "XS" },
      ],
      price: { amount: variant.price.amount, currencyCode: "USD" },
      compareAtPrice: {
        amount: variant.compareAtPrice?.amount,
        currencyCode: "USD",
      },
      image: {
        url: variant.image?.url,
        altText: variant.image?.altText,
        width: 768,
        height: 1344,
      },
    });
  });

  it("maps a variant with no compare-at price to null rather than zero", () => {
    expect(toProductVariant({ ...variant, compareAtPrice: null }).compareAtPrice).toBeNull();
  });

  it("maps a variant with no image of its own to null", () => {
    expect(toProductVariant({ ...variant, image: null }).image).toBeNull();
  });
});

describe("toProductDetail", () => {
  const detail = toProductDetail(productByHandleFixture.product);

  it("maps the scalar fields", () => {
    expect(detail.handle).toBe("waterproof-wading-jacket-with-breathable-shell");
    expect(detail.title).toBe("Waterproof Wading Jacket With Breathable Shell");
    expect(detail.vendor).toBe("Summit Drift Outfitters");
  });

  it("keeps description and descriptionHtml as separate fields", () => {
    // `description` feeds metadata and JSON-LD, `descriptionHtml` feeds RichText.
    expect(detail.description).not.toContain("<p>");
    expect(detail.descriptionHtml).toContain("<p>");
  });

  // Sanitizing here as well would split the responsibility across two layers; RichText owns
  // it. This asserts the raw value survives the mapper untouched.
  it("passes descriptionHtml through unsanitized", () => {
    expect(detail.descriptionHtml).toBe(productByHandleFixture.product.descriptionHtml);
  });

  it("maps every image and every variant", () => {
    expect(detail.images).toHaveLength(3);
    expect(detail.variants).toHaveLength(12);
    expect(detail.images.every((image) => image.url.length > 0)).toBe(true);
  });

  it("maps the option axes the catalog uses, lowercase as the API sends them", () => {
    expect(detail.options).toStrictEqual([
      { name: "color", values: ["slate", "moss", "clay"] },
      { name: "size", values: ["XS", "S", "M", "L"] },
    ]);
  });

  it("produces a variant for every option combination", () => {
    const combinations = detail.options.reduce((total, option) => total * option.values.length, 1);

    expect(detail.variants).toHaveLength(combinations);
  });
});
