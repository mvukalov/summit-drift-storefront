// Captured from https://apparel-outdoor.mock.shop/api on 2026-09-27: the real response to the
// document Apollo sends (__typename added to every selection set except the root).
// `query: "jacket"`, `limit: 3` (the combobox itself asks for 6; 3 keeps the fixture readable).
import type { PredictiveSearchQuery } from "@/lib/graphql/generated/graphql";

export const predictiveSearchFixture = {
  predictiveSearch: {
    __typename: "PredictiveSearchResult",
    products: [
      {
        handle: "waterproof-wading-jacket-with-breathable-shell",
        title: "Waterproof Wading Jacket With Breathable Shell",
        options: [
          { name: "color", values: ["slate", "moss", "clay"], __typename: "ProductOption" },
          { name: "size", values: ["XS", "S", "M", "L"], __typename: "ProductOption" },
        ],
        featuredImage: {
          url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
          altText:
            "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
          width: 768,
          height: 1344,
          __typename: "Image",
        },
        priceRange: {
          minVariantPrice: { amount: "249.0", currencyCode: "USD", __typename: "MoneyV2" },
          __typename: "ProductPriceRange",
        },
        compareAtPriceRange: {
          minVariantPrice: { amount: "323.7", currencyCode: "USD", __typename: "MoneyV2" },
          maxVariantPrice: { amount: "356.07", currencyCode: "USD", __typename: "MoneyV2" },
          __typename: "ProductPriceRange",
        },
        __typename: "Product",
      },
      {
        handle: "oversized-technical-nylon-jacket",
        title: "Oversized Technical Nylon Jacket",
        options: [
          { name: "color", values: ["slate", "moss", "clay"], __typename: "ProductOption" },
          { name: "size", values: ["XS", "S", "M", "L"], __typename: "ProductOption" },
        ],
        featuredImage: {
          url: "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/4d650e280976e479b9a8e6ca7adee4c3.png?v=14994393",
          altText:
            "Oversized technical nylon jacket, Three-quarter angle as default—captures garment structure, layering, and fabric quality...",
          width: 768,
          height: 1344,
          __typename: "Image",
        },
        priceRange: {
          minVariantPrice: { amount: "485.0", currencyCode: "USD", __typename: "MoneyV2" },
          __typename: "ProductPriceRange",
        },
        compareAtPriceRange: {
          minVariantPrice: { amount: "0.0", currencyCode: "USD", __typename: "MoneyV2" },
          maxVariantPrice: { amount: "0.0", currencyCode: "USD", __typename: "MoneyV2" },
          __typename: "ProductPriceRange",
        },
        __typename: "Product",
      },
      {
        handle: "ripstop-shell-jacket-with-storm-guard",
        title: "Ripstop Shell Jacket with Storm Guard",
        options: [
          { name: "color", values: ["slate", "moss", "clay"], __typename: "ProductOption" },
          { name: "size", values: ["XS", "S", "M", "L"], __typename: "ProductOption" },
        ],
        featuredImage: {
          url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/feb471048906f9b986836d4d4a30578c.png?v=15035948",
          altText:
            "Technical ripstop shell jacket, Default angle is three-quarter view for jackets and pants—flat yet dimensional to convey...",
          width: 768,
          height: 1344,
          __typename: "Image",
        },
        priceRange: {
          minVariantPrice: { amount: "189.0", currencyCode: "USD", __typename: "MoneyV2" },
          __typename: "ProductPriceRange",
        },
        compareAtPriceRange: {
          minVariantPrice: { amount: "0.0", currencyCode: "USD", __typename: "MoneyV2" },
          maxVariantPrice: { amount: "0.0", currencyCode: "USD", __typename: "MoneyV2" },
          __typename: "ProductPriceRange",
        },
        __typename: "Product",
      },
    ],
  },
} satisfies PredictiveSearchQuery;

// `query: ""`, or a query with no matches: `predictiveSearch.queries` is always empty on
// mock.shop too (verified, docs/predictive-search.md) — no suggestions to build UI around.
export const emptyPredictiveSearchFixture = {
  predictiveSearch: { __typename: "PredictiveSearchResult", products: [] },
} satisfies PredictiveSearchQuery;
