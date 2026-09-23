import { describe, expect, it } from "vitest";
import { toProductDetail } from "@/lib/catalog/mappers";
import { productByHandleFixture } from "@/test/msw/fixtures/productByHandle";
import type { ProductDetail, ProductVariant } from "@/types/catalog";
import { buildProductJsonLd } from "./product";

const product = toProductDetail(productByHandleFixture.product);
const PATH = "/products/waterproof-wading-jacket-with-breathable-shell";

function withVariants(variants: ProductVariant[]): ProductDetail {
  return { ...product, variants };
}

describe("buildProductJsonLd", () => {
  const jsonLd = buildProductJsonLd(product, PATH);

  it("declares the schema.org Product type", () => {
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Product");
  });

  it("uses the plain-text description, not the HTML one", () => {
    expect(jsonLd.description).toBe(product.description);
    expect(String(jsonLd.description)).not.toContain("<p>");
  });

  it("lists every image and names the brand", () => {
    expect(jsonLd.image).toHaveLength(3);
    expect(jsonLd.brand).toStrictEqual({ "@type": "Brand", name: "Summit Drift Outfitters" });
  });

  it("resolves the url to an absolute one, as schema.org requires", () => {
    expect(String(jsonLd.url)).toMatch(/^https?:\/\/.+\/products\//);
  });

  describe("offers", () => {
    it("aggregates a multi-variant product across its price span", () => {
      const offers = jsonLd.offers as Record<string, unknown>;
      const amounts = product.variants.map((variant) => Number(variant.price.amount));

      expect(offers["@type"]).toBe("AggregateOffer");
      expect(offers.offerCount).toBe(12);
      expect(offers.lowPrice).toBe(String(Math.min(...amounts)));
      expect(offers.highPrice).toBe(String(Math.max(...amounts)));
      expect(offers.priceCurrency).toBe("USD");
      expect(offers.offers).toHaveLength(12);
    });

    // An aggregate of one is not what consumers expect.
    it("uses a plain Offer for a single-variant product", () => {
      const [only] = product.variants;
      if (!only) throw new Error("Fixture has no variants");

      const offers = buildProductJsonLd(withVariants([only]), PATH).offers as Record<
        string,
        unknown
      >;

      expect(offers["@type"]).toBe("Offer");
      expect(offers.price).toBe(only.price.amount);
      expect(offers.availability).toBe("https://schema.org/InStock");
    });

    it("marks a sold-out variant as OutOfStock", () => {
      const [first] = product.variants;
      if (!first) throw new Error("Fixture has no variants");

      const offers = buildProductJsonLd(withVariants([{ ...first, availableForSale: false }]), PATH)
        .offers as Record<string, unknown>;

      expect(offers.availability).toBe("https://schema.org/OutOfStock");
    });

    it("is out of stock in aggregate only when no variant can be bought", () => {
      const soldOut = product.variants.map((variant) => ({
        ...variant,
        availableForSale: false,
      }));

      const offers = buildProductJsonLd(withVariants(soldOut), PATH).offers as Record<
        string,
        unknown
      >;

      expect(offers.availability).toBe("https://schema.org/OutOfStock");
    });
  });

  // The JsonLd component escapes `<`, but the shape must survive a round-trip regardless.
  it("serializes to valid JSON", () => {
    expect(() => JSON.parse(JSON.stringify(jsonLd))).not.toThrow();
  });
});
