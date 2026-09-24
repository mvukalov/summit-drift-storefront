import { describe, expect, it } from "vitest";
import type { Money } from "@/types/catalog";
import type { Cart, CartLine } from "@/types/cart";
import { canAddToLine, clampQuantity, MAX_QUANTITY, MIN_QUANTITY } from "./limits";

const VARIANT = "gid://shopify/ProductVariant/9732";

function cartWith(variantId: string, quantity: number): Cart {
  const unitPrice: Money = { amount: "10.00", currencyCode: "USD" };
  const line: CartLine = {
    id: "line-1",
    variantId,
    title: "Ripstop Shell Jacket",
    options: [],
    image: null,
    quantity,
    unitPrice,
    lineTotal: { amount: (10 * quantity).toFixed(2), currencyCode: "USD" },
  };
  return {
    id: "cart-1",
    lines: [line],
    subtotal: line.lineTotal,
    totalQuantity: quantity,
    checkoutUrl: "https://example.test/checkout",
  };
}

const emptyCart: Cart = {
  id: "cart-1",
  lines: [],
  subtotal: { amount: "0.00", currencyCode: "USD" },
  totalQuantity: 0,
  checkoutUrl: "https://example.test/checkout",
};

describe("clampQuantity", () => {
  it.each([
    [0, MIN_QUANTITY],
    [-5, MIN_QUANTITY],
    [1, 1],
    [10, 10],
    [11, MAX_QUANTITY],
    [9999, MAX_QUANTITY],
  ])("clamps %i to %i", (input, expected) => {
    expect(clampQuantity(input)).toBe(expected);
  });

  it.each([
    [Number.NaN, MIN_QUANTITY],
    [Number.POSITIVE_INFINITY, MIN_QUANTITY],
  ])("falls back to the minimum for %s", (input, expected) => {
    expect(clampQuantity(input)).toBe(expected);
  });

  it("truncates a fractional quantity", () => {
    expect(clampQuantity(3.9)).toBe(3);
  });
});

/**
 * These cases *are* decision 4. An over-limit add is refused outright; it is never clamped
 * down to the ceiling and never partially applied. If clamping is ever reintroduced here,
 * these assertions are what should fail loudly.
 */
describe("canAddToLine", () => {
  it("allows an add that stays under the maximum", () => {
    expect(canAddToLine(cartWith(VARIANT, 2), VARIANT, 3)).toEqual({ ok: true, quantity: 5 });
  });

  it("allows an add that lands exactly on the maximum", () => {
    expect(canAddToLine(cartWith(VARIANT, 8), VARIANT, 2)).toEqual({
      ok: true,
      quantity: MAX_QUANTITY,
    });
  });

  it("refuses one more when the line is already at the maximum", () => {
    expect(canAddToLine(cartWith(VARIANT, MAX_QUANTITY), VARIANT, 1)).toEqual({
      ok: false,
      reason: "at-maximum",
      current: MAX_QUANTITY,
    });
  });

  it("refuses an overshoot outright instead of landing on the maximum", () => {
    const result = canAddToLine(cartWith(VARIANT, 8), VARIANT, 5);

    expect(result.ok).toBe(false);
    // The point of the decision: 8 + 5 does not quietly become 10.
    expect(result).not.toMatchObject({ ok: true, quantity: MAX_QUANTITY });
  });

  it("judges a variant that is not in the cart on the requested amount alone", () => {
    const other = cartWith("gid://shopify/ProductVariant/other", MAX_QUANTITY);

    expect(canAddToLine(other, VARIANT, 4)).toEqual({ ok: true, quantity: 4 });
  });

  it("refuses a request above the maximum on an empty cart", () => {
    expect(canAddToLine(emptyCart, VARIANT, 11)).toEqual({
      ok: false,
      reason: "at-maximum",
      current: 0,
    });
  });

  it("allows exactly the maximum on an empty cart", () => {
    expect(canAddToLine(emptyCart, VARIANT, MAX_QUANTITY)).toEqual({
      ok: true,
      quantity: MAX_QUANTITY,
    });
  });

  it.each([0, -1])("refuses a request of %i", (requested) => {
    expect(canAddToLine(emptyCart, VARIANT, requested).ok).toBe(false);
  });

  it("reports what the line already holds, so the message can be specific", () => {
    const result = canAddToLine(cartWith(VARIANT, 7), VARIANT, 9);

    expect(result).toMatchObject({ ok: false, current: 7 });
  });
});
