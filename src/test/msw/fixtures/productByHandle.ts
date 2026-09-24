// Captured from https://apparel-outdoor.mock.shop/api on 2026-09-23: the real response to the
// document Apollo sends (__typename added to every selection set except the root).
import type { ProductByHandleQuery } from "@/lib/graphql/generated/graphql";

// handle: "waterproof-wading-jacket-with-breathable-shell" (3 images, 12 variants,
// every variant on sale and every one reporting the product featured image).
export const productByHandleFixture = {
  product: {
    handle: "waterproof-wading-jacket-with-breathable-shell",
    title: "Waterproof Wading Jacket With Breathable Shell",
    vendor: "Summit Drift Outfitters",
    description:
      "Early mornings on the river call for a jacket that blocks out the damp without weighing you down. This technical shell keeps you dry and moving freely, no matter how the weather turns. Advanced waterproof membrane shields against steady rain and spray Strategically placed ventilation panels prevent overheating on active treks Articulated sleeves and adjustable cuffs support complete casting mobility",
    descriptionHtml:
      "<p>Early mornings on the river call for a jacket that blocks out the damp without weighing you down. This technical shell keeps you dry and moving freely, no matter how the weather turns.</p><ul><li>Advanced waterproof membrane shields against steady rain and spray</li><li>Strategically placed ventilation panels prevent overheating on active treks</li><li>Articulated sleeves and adjustable cuffs support complete casting mobility</li></ul>",
    options: [
      {
        name: "color",
        values: ["slate", "moss", "clay"],
        __typename: "ProductOption",
      },
      {
        name: "size",
        values: ["XS", "S", "M", "L"],
        __typename: "ProductOption",
      },
    ],
    images: {
      nodes: [
        {
          url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
          altText:
            "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
          width: 768,
          height: 1344,
          __typename: "Image",
        },
        {
          url: "https://cdn.shopify.com/mock-shop-production-media/apparel-outdoor/6ebde316-051f-4e50-b9e8-c2e67d5b2ac2.png",
          altText: "Alternate angle view of Waterproof Wading Jacket With Breathable Shell",
          width: 768,
          height: 1344,
          __typename: "Image",
        },
        {
          url: "https://cdn.shopify.com/mock-shop-production-media/apparel-outdoor/f9234f27-7630-4783-90b6-b1b848679ee7.png",
          altText: "Waterproof Wading Jacket With Breathable Shell in use",
          width: 768,
          height: 1344,
          __typename: "Image",
        },
      ],
      __typename: "ImageConnection",
    },
    variants: {
      nodes: [
        {
          id: "gid://shopify/ProductVariant/9732",
          title: "slate / XS",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-1",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "slate",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "XS",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "249.0",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "323.7",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9733",
          title: "slate / S",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-2",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "slate",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "S",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "249.0",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "323.7",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9734",
          title: "slate / M",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-3",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "slate",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "M",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "249.0",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "323.7",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9735",
          title: "slate / L",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-4",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "slate",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "L",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "249.0",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "323.7",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9736",
          title: "moss / XS",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-5",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "moss",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "XS",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "261.45",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "339.89",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9737",
          title: "moss / S",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-6",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "moss",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "S",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "261.45",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "339.89",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9738",
          title: "moss / M",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-7",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "moss",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "M",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "261.45",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "339.89",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9739",
          title: "moss / L",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-8",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "moss",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "L",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "261.45",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "339.89",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9740",
          title: "clay / XS",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-9",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "clay",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "XS",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "273.9",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "356.07",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9741",
          title: "clay / S",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-10",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "clay",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "S",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "273.9",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "356.07",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9742",
          title: "clay / M",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-11",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "clay",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "M",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "273.9",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "356.07",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
        {
          id: "gid://shopify/ProductVariant/9743",
          title: "clay / L",
          sku: "WATERPROOF-WADING-JACKET-WITH-BREATHABLE-SHELL-12",
          availableForSale: true,
          selectedOptions: [
            {
              name: "color",
              value: "clay",
              __typename: "SelectedOption",
            },
            {
              name: "size",
              value: "L",
              __typename: "SelectedOption",
            },
          ],
          price: {
            amount: "273.9",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          compareAtPrice: {
            amount: "356.07",
            currencyCode: "USD",
            __typename: "MoneyV2",
          },
          image: {
            url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
            altText:
              "Technical waterproof wading jacket, Default angle is 3/4 view—showing both form and technical detail (e.g., reel seat...",
            width: 768,
            height: 1344,
            __typename: "Image",
          },
          __typename: "ProductVariant",
        },
      ],
      __typename: "ProductVariantConnection",
    },
    __typename: "Product",
  },
} satisfies ProductByHandleQuery;

// handle: "does-not-exist": the API returns null without an error
export const unknownProductFixture = { product: null } satisfies ProductByHandleQuery;
