// Captured from https://apparel-outdoor.mock.shop/api on 2026-09-22: the real response to the
// document Apollo sends (__typename added to every selection set except the root).
import type { FeaturedProductsQuery } from "@/lib/graphql/generated/graphql";

// One product per collection; the shell jacket and the tee are on sale.
export const featuredProductsFixture = {
  collections: {
    nodes: [
      {
        handle: "summit-protection-shells",
        products: {
          nodes: [
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
                minVariantPrice: {
                  amount: "249.0",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                __typename: "ProductPriceRange",
              },
              compareAtPriceRange: {
                minVariantPrice: {
                  amount: "323.7",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                maxVariantPrice: {
                  amount: "356.07",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                __typename: "ProductPriceRange",
              },
              __typename: "Product",
            },
          ],
          __typename: "ProductConnection",
        },
        __typename: "Collection",
      },
      {
        handle: "trail-foundation-layers",
        products: {
          nodes: [
            {
              handle: "performance-technical-tee",
              title: "Performance Technical Tee",
              options: [
                { name: "size", values: ["S", "M", "L"], __typename: "ProductOption" },
                {
                  name: "color",
                  values: ["charcoal", "sand", "fern", "stone"],
                  __typename: "ProductOption",
                },
              ],
              featuredImage: {
                url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/397c28136fe9eeff79e6bad8d5329065.png?v=13678502",
                altText:
                  "Performance technical tee, Default arrangement is 3/4 angle on apparel laid flat or gently draped over curved surfaces for...",
                width: 768,
                height: 1344,
                __typename: "Image",
              },
              priceRange: {
                minVariantPrice: {
                  amount: "45.0",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                __typename: "ProductPriceRange",
              },
              compareAtPriceRange: {
                minVariantPrice: {
                  amount: "58.5",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                maxVariantPrice: {
                  amount: "64.35",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                __typename: "ProductPriceRange",
              },
              __typename: "Product",
            },
          ],
          __typename: "ProductConnection",
        },
        __typename: "Collection",
      },
      {
        handle: "rugged-traverse-bottoms",
        products: {
          nodes: [
            {
              handle: "jogger-aus-technischer-mikrofaser",
              title: "Joggers in technical microfiber",
              options: [
                {
                  name: "material",
                  values: ["nylon-blend", "stretch-canvas", "soft-shell"],
                  __typename: "ProductOption",
                },
                { name: "size", values: ["30", "32", "34", "36"], __typename: "ProductOption" },
              ],
              featuredImage: {
                url: "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/3447b938643f0f1df0e77cbbf9dea9b3.png?v=15046180",
                altText:
                  "Technical joggers, Single-garment focus per frame; 3/4 angle as default to reveal both silhouette and surface texture....",
                width: 768,
                height: 1344,
                __typename: "Image",
              },
              priceRange: {
                minVariantPrice: {
                  amount: "98.0",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                __typename: "ProductPriceRange",
              },
              compareAtPriceRange: {
                minVariantPrice: {
                  amount: "0.0",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                maxVariantPrice: {
                  amount: "0.0",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                __typename: "ProductPriceRange",
              },
              __typename: "Product",
            },
          ],
          __typename: "ProductConnection",
        },
        __typename: "Collection",
      },
      {
        handle: "expedition-field-gear",
        products: {
          nodes: [
            {
              handle: "topo-lined-canvas-utility-cap",
              title: "Topo-Lined Canvas Utility Cap",
              options: [
                {
                  name: "finish",
                  values: ["matte", "weather-resistant", "breathable"],
                  __typename: "ProductOption",
                },
                {
                  name: "size",
                  values: ["small", "medium", "large", "extra-large"],
                  __typename: "ProductOption",
                },
              ],
              featuredImage: {
                url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/f19b576cc8c845833762194272a822d7.png?v=14626304",
                altText:
                  "Topo-lined canvas utility cap, Default angle is a three-quarter product portrait shot at eye-level against a neutral...",
                width: 768,
                height: 1344,
                __typename: "Image",
              },
              priceRange: {
                minVariantPrice: {
                  amount: "48.0",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                __typename: "ProductPriceRange",
              },
              compareAtPriceRange: {
                minVariantPrice: {
                  amount: "0.0",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                maxVariantPrice: {
                  amount: "0.0",
                  currencyCode: "USD",
                  __typename: "MoneyV2",
                },
                __typename: "ProductPriceRange",
              },
              __typename: "Product",
            },
          ],
          __typename: "ProductConnection",
        },
        __typename: "Collection",
      },
    ],
    __typename: "CollectionConnection",
  },
} satisfies FeaturedProductsQuery;
