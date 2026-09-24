import { describe, expect, it } from "vitest";
import type { CartFragment, CartLineFragment } from "@/lib/graphql/generated/graphql";
import { cartByIdFixture } from "@/test/msw/fixtures/cart";
import { emptyCart, toCart, toCartLine } from "./mappers";

// The fixture is a real `cart(id)` response captured on 2026-09-24.
const fixture = cartByIdFixture.cart as NonNullable<CartByIdCart>;
type CartByIdCart = typeof cartByIdFixture.cart;

describe("toCart", () => {
  it("maps a real response to the domain shape", () => {
    const cart = toCart(fixture);

    expect(cart.id).toBe(fixture.id);
    expect(cart.totalQuantity).toBe(5);
    expect(cart.subtotal).toEqual({ amount: "1953.0", currencyCode: "USD" });
    expect(cart.checkoutUrl).toBe("https://apparel-outdoor.hydrogen.mock.shop/checkout");
    expect(cart.lines).toHaveLength(2);
  });

  it("preserves the API's newest-first line order", () => {
    const cart = toCart(fixture);

    expect(cart.lines.map((line) => line.id)).toEqual([
      "gid://shopify/CartLine/14265",
      "gid://shopify/CartLine/14264",
    ]);
  });

  it("carries no __typename into the domain objects", () => {
    const cart = toCart(fixture);

    expect(JSON.stringify(cart)).not.toContain("__typename");
  });

  it("derives a subtotal the API agrees with", () => {
    const cart = toCart(fixture);

    const computed = cart.lines.reduce(
      (sum, line) => sum + Number(line.unitPrice.amount) * line.quantity,
      0,
    );

    expect(computed).toBe(Number(cart.subtotal.amount));
  });
});

describe("toCartLine", () => {
  const [newest, older] = fixture.lines.nodes;

  it("maps the product title, options, quantity and prices", () => {
    const line = toCartLine(newest!);

    expect(line).toMatchObject({
      id: "gid://shopify/CartLine/14265",
      variantId: "gid://shopify/ProductVariant/9745",
      quantity: 3,
      unitPrice: { amount: "485.0", currencyCode: "USD" },
      lineTotal: { amount: "1455.0", currencyCode: "USD" },
    });
    expect(line.title).toBe("Oversized Technical Nylon Jacket");
    expect(line.options).toEqual([
      { name: "color", value: "slate" },
      { name: "size", value: "S" },
    ]);
  });

  it("maps the variant image with its dimensions", () => {
    const line = toCartLine(older!);

    expect(line.image).toMatchObject({ width: 768, height: 1344 });
    expect(line.image?.url).toContain("cdn.shopify.com");
  });

  // `amountPerQuantity` is non-null in the schema and was present on all 27 real lines
  // probed on 2026-09-24, so this path is unreachable against today's API. It is covered
  // synthetically, the same way the product page covered its out-of-stock state: the cast
  // builds a response that violates the schema on purpose, which is the only way in.
  it("falls back to the variant price when amountPerQuantity is missing", () => {
    const withoutUnitPrice = {
      ...newest!,
      cost: { ...newest!.cost, amountPerQuantity: null },
    } as unknown as CartLineFragment;

    const line = toCartLine(withoutUnitPrice);

    expect(line.unitPrice).toEqual({ amount: "485.0", currencyCode: "USD" });
  });

  it("maps a line whose variant has no image", () => {
    const withoutImage = {
      ...newest!,
      merchandise: { ...newest!.merchandise, image: null },
    } as CartLineFragment;

    expect(toCartLine(withoutImage).image).toBeNull();
  });
});

describe("emptyCart", () => {
  it("has no lines, a zero subtotal and no checkout link", () => {
    const cart = emptyCart();

    expect(cart.lines).toEqual([]);
    expect(cart.totalQuantity).toBe(0);
    expect(Number(cart.subtotal.amount)).toBe(0);
    expect(cart.checkoutUrl).toBe("");
    expect(cart.id).toBe("");
  });

  // PR #14's `EMPTY_FACETS` was one shared mutable object handed to every request.
  it("returns a fresh object each call", () => {
    const first = emptyCart();
    const second = emptyCart();

    expect(first).not.toBe(second);
    expect(first.lines).not.toBe(second.lines);
  });

  it("accepts a currency", () => {
    expect(emptyCart("USD").subtotal.currencyCode).toBe("USD");
  });
});

// Guards the assumption the drawer's totals rely on: the mapper reads the API's own
// subtotal, and the reducer recomputes it. They must agree on a real response.
describe("mapper and reducer agreement", () => {
  it("maps a cart whose lines all carry a currency", () => {
    const cart: CartFragment = fixture;

    toCart(cart).lines.forEach((line) => {
      expect(line.unitPrice.currencyCode).toBe("USD");
      expect(line.lineTotal.currencyCode).toBe("USD");
    });
  });
});
