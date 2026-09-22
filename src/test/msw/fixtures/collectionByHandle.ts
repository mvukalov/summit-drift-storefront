// Captured from https://apparel-outdoor.mock.shop/api on 2026-09-22: the real response to the
// document Apollo sends (__typename added to every selection set except the root).
import type { CollectionByHandleQuery } from "@/lib/graphql/generated/graphql";

// handle: "summit-protection-shells" (3 of 8 products on sale)
export const collectionByHandleFixture = {
  collection: {
    handle: "summit-protection-shells",
    title: "Summit Protection Shells",
    description:
      "Weatherproof gear featuring an earthy muted palette, contemplative rugged mood, and technical ripstop material language for high-altitude endurance.",
    image: {
      url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
      altText: null,
      width: null,
      height: null,
      __typename: "Image",
    },
    __typename: "Collection",
    products: {
      nodes: [
        {
          handle: "waterproof-wading-jacket-with-breathable-shell",
          title: "Waterproof Wading Jacket With Breathable Shell",
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
        {
          handle: "technical-shell-jacket",
          title: "Technical Shell Jacket",
          featuredImage: {
            url: "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/20981296280d02d45bb4305190dca180.png?v=13667201",
            altText:
              "Urban technical shell jacket, Three-quarter angle product shots on neutral textured backdrops (concrete slab or asphalt),...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          priceRange: {
            minVariantPrice: { amount: "199.99", currencyCode: "USD", __typename: "MoneyV2" },
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
          handle: "oversized-t-shirt",
          title: "Oversized T-Shirt",
          featuredImage: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/3cdac0f19fdd762e90af69d5cdbcfc0c.png?v=13106692",
            altText:
              "A dark orange oversized t-shirt displayed on a clean, perfectly centered with soft, even illumination. The shirt's bold...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          priceRange: {
            minVariantPrice: { amount: "25.0", currencyCode: "USD", __typename: "MoneyV2" },
            __typename: "ProductPriceRange",
          },
          compareAtPriceRange: {
            minVariantPrice: { amount: "32.5", currencyCode: "USD", __typename: "MoneyV2" },
            maxVariantPrice: { amount: "35.75", currencyCode: "USD", __typename: "MoneyV2" },
            __typename: "ProductPriceRange",
          },
          __typename: "Product",
        },
        {
          handle: "lightweight-urban-jacket",
          title: "Lightweight Urban Jacket",
          featuredImage: {
            url: "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/9a3bcdd3ddf729be3bbe311c9aab1451.png?v=13118838",
            altText:
              "Photograph a lightweight jacket on a clean, urban slate backdrop. The jacket is perfectly centered, with soft, shadowless...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          priceRange: {
            minVariantPrice: { amount: "120.0", currencyCode: "USD", __typename: "MoneyV2" },
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
          handle: "oversized-outerwear-jacket",
          title: "Oversized Outerwear Jacket",
          featuredImage: {
            url: "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/c44c8650f9f80d3b97b36e831a0a8877.png?v=13210840",
            altText:
              "Stylish Outerwear Jacket, Capture products in a 3/4 angle against neutral backgrounds with slight textural elements that...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          priceRange: {
            minVariantPrice: { amount: "199.99", currencyCode: "USD", __typename: "MoneyV2" },
            __typename: "ProductPriceRange",
          },
          compareAtPriceRange: {
            minVariantPrice: { amount: "259.99", currencyCode: "USD", __typename: "MoneyV2" },
            maxVariantPrice: { amount: "298.99", currencyCode: "USD", __typename: "MoneyV2" },
            __typename: "ProductPriceRange",
          },
          __typename: "Product",
        },
        {
          handle: "orange-red-streetwear-jacket",
          title: "Orange Red Streetwear Jacket",
          featuredImage: {
            url: "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/b209feeaa227ee9941c969584dde7c04.png?v=13234016",
            altText:
              "Orange Red streetwear jacket, For product shots, focus on a 3/4 angle to capture the clothing's form and fit effectively....",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          priceRange: {
            minVariantPrice: { amount: "75.0", currencyCode: "USD", __typename: "MoneyV2" },
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
      __typename: "ProductConnection",
    },
  },
} satisfies CollectionByHandleQuery;

// handle: "does-not-exist": the API returns null without an error
export const unknownCollectionFixture = { collection: null } satisfies CollectionByHandleQuery;
