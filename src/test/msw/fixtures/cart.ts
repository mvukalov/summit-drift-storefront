// Captured from https://apparel-outdoor.mock.shop/api on 2026-09-24: the real response to the
// document Apollo sends (__typename added to every selection set except the root).
import type { CartByIdQuery } from "@/lib/graphql/generated/graphql";

// A cart with two lines, created with `cartCreate` and then re-read by id. Deliberately
// mixed: the newest line (485.00 x 3) is not on sale, the older one (249.00 x 2) is, and the
// API returned them newest-first. Subtotal 1953.00 is exactly 1455 + 498, which is what makes
// an optimistic subtotal safe to compute client-side.
export const cartByIdFixture = {
  cart: {
    id: "gid://shopify/Cart/c1-f465b267b5664c5584b7a5e09adc7a1f?key=77aa781e3cb28ad3b6bf7f7726c5ca41",
    totalQuantity: 5,
    checkoutUrl: "https://apparel-outdoor.hydrogen.mock.shop/checkout",
    cost: {
      subtotalAmount: {
        amount: "1953.0",
        currencyCode: "USD",
        __typename: "MoneyV2",
      },
      __typename: "CartCost",
    },
    lines: {
      nodes: [
        {
          id: "gid://shopify/CartLine/14265",
          quantity: 3,
          cost: {
            amountPerQuantity: {
              amount: "485.0",
              currencyCode: "USD",
              __typename: "MoneyV2",
            },
            totalAmount: {
              amount: "1455.0",
              currencyCode: "USD",
              __typename: "MoneyV2",
            },
            __typename: "CartLineCost",
          },
          merchandise: {
            id: "gid://shopify/ProductVariant/9745",
            title: "slate / S",
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
            image: {
              url: "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/4d650e280976e479b9a8e6ca7adee4c3.png?v=14994393",
              altText:
                "Oversized technical nylon jacket, Three-quarter angle as default\u2014captures garment structure, layering, and fabric quality...",
              width: 768,
              height: 1344,
              __typename: "Image",
            },
            price: {
              amount: "485.0",
              currencyCode: "USD",
              __typename: "MoneyV2",
            },
            product: {
              title: "Oversized Technical Nylon Jacket",
              __typename: "Product",
            },
            __typename: "ProductVariant",
          },
          __typename: "CartLine",
        },
        {
          id: "gid://shopify/CartLine/14264",
          quantity: 2,
          cost: {
            amountPerQuantity: {
              amount: "249.0",
              currencyCode: "USD",
              __typename: "MoneyV2",
            },
            totalAmount: {
              amount: "498.0",
              currencyCode: "USD",
              __typename: "MoneyV2",
            },
            __typename: "CartLineCost",
          },
          merchandise: {
            id: "gid://shopify/ProductVariant/9732",
            title: "slate / XS",
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
            image: {
              url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
              altText:
                "Technical waterproof wading jacket, Default angle is 3/4 view\u2014showing both form and technical detail (e.g., reel seat...",
              width: 768,
              height: 1344,
              __typename: "Image",
            },
            price: {
              amount: "249.0",
              currencyCode: "USD",
              __typename: "MoneyV2",
            },
            product: {
              title: "Waterproof Wading Jacket With Breathable Shell",
              __typename: "Product",
            },
            __typename: "ProductVariant",
          },
          __typename: "CartLine",
        },
      ],
      __typename: "BaseCartLineConnection",
    },
    __typename: "Cart",
  },
} satisfies CartByIdQuery;

// A dead, expired or malformed id: the API returns `cart: null` with no GraphQL error.
export const unknownCartFixture = { cart: null } satisfies CartByIdQuery;
