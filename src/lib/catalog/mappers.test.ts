import { describe, expect, it } from "vitest";
import type { ProductCardFragment } from "@/lib/graphql/generated/graphql";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { collectionsFixture } from "@/test/msw/fixtures/collections";
import { mainMenuFixture } from "@/test/msw/fixtures/mainMenu";
import { toCollectionSummary, toMenuItem, toProductCard } from "./mappers";

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
