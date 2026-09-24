import { describe, expect, it } from "vitest";
import type { Money } from "@/types/catalog";
import type { Cart, CartLine } from "@/types/cart";
import { MAX_QUANTITY } from "./limits";
import { cartReducer, isOptimisticLine, optimisticLineId, type NewCartLine } from "./reducer";

const USD = "USD";

function money(amount: string): Money {
  return { amount, currencyCode: USD };
}

function line(overrides: Partial<CartLine> & Pick<CartLine, "id" | "variantId">): CartLine {
  const quantity = overrides.quantity ?? 1;
  const unitPrice = overrides.unitPrice ?? money("100.00");
  return {
    title: "Ripstop Shell Jacket",
    options: [{ name: "color", value: "slate" }],
    image: null,
    quantity,
    unitPrice,
    lineTotal: money((Number(unitPrice.amount) * quantity).toFixed(2)),
    ...overrides,
  };
}

function cart(lines: CartLine[]): Cart {
  const subtotal = lines.reduce((sum, l) => sum + Number(l.unitPrice.amount) * l.quantity, 0);
  return {
    id: "gid://shopify/Cart/c1-abc?key=def",
    lines,
    subtotal: money(subtotal.toFixed(2)),
    totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    checkoutUrl: "https://example.test/checkout",
  };
}

const newLine: NewCartLine = {
  variantId: "gid://shopify/ProductVariant/9732",
  title: "Waterproof Wading Jacket",
  options: [{ name: "color", value: "slate" }],
  image: null,
  quantity: 1,
  unitPrice: money("249.00"),
};

describe("cartReducer", () => {
  describe("add", () => {
    it("prepends a new line, because the API returns lines newest-first", () => {
      const before = cart([line({ id: "1", variantId: "v1" })]);

      const after = cartReducer(before, { type: "add", line: newLine });

      expect(after.lines).toHaveLength(2);
      expect(after.lines[0]?.variantId).toBe(newLine.variantId);
      expect(after.lines[1]?.id).toBe("1");
    });

    it("gives a new line a placeholder id the server will replace", () => {
      const after = cartReducer(cart([]), { type: "add", line: newLine });

      expect(after.lines[0]?.id).toBe(optimisticLineId(newLine.variantId));
      expect(isOptimisticLine(after.lines[0]?.id ?? "")).toBe(true);
    });

    it("merges into the existing line of the same variant instead of adding a second", () => {
      const before = cart([
        line({ id: "1", variantId: newLine.variantId, quantity: 2, unitPrice: money("249.00") }),
      ]);

      const after = cartReducer(before, { type: "add", line: { ...newLine, quantity: 3 } });

      expect(after.lines).toHaveLength(1);
      expect(after.lines[0]?.quantity).toBe(5);
      expect(after.lines[0]?.id).toBe("1");
    });

    it("leaves a merged line in its original position", () => {
      const before = cart([
        line({ id: "newest", variantId: "v-other" }),
        line({ id: "older", variantId: newLine.variantId, quantity: 1 }),
      ]);

      const after = cartReducer(before, { type: "add", line: newLine });

      expect(after.lines.map((l) => l.id)).toEqual(["newest", "older"]);
    });

    it("recomputes the line total and the cart totals", () => {
      const after = cartReducer(cart([]), { type: "add", line: { ...newLine, quantity: 2 } });

      expect(after.lines[0]?.lineTotal).toEqual(money("498.00"));
      expect(after.subtotal).toEqual(money("498.00"));
      expect(after.totalQuantity).toBe(2);
    });

    // Not the user-facing path: `canAddToLine` refuses an over-limit add before this runs
    // (decision 4). This only proves the reducer stays total if a caller skips the guard.
    it("clamps defensively rather than exceeding the maximum", () => {
      const before = cart([line({ id: "1", variantId: newLine.variantId, quantity: 8 })]);

      const after = cartReducer(before, { type: "add", line: { ...newLine, quantity: 5 } });

      expect(after.lines[0]?.quantity).toBe(MAX_QUANTITY);
    });
  });

  describe("setQuantity", () => {
    it("updates the quantity and the derived totals", () => {
      const before = cart([
        line({ id: "1", variantId: "v1", quantity: 1, unitPrice: money("50.00") }),
      ]);

      const after = cartReducer(before, { type: "setQuantity", lineId: "1", quantity: 4 });

      expect(after.lines[0]?.quantity).toBe(4);
      expect(after.lines[0]?.lineTotal).toEqual(money("200.00"));
      expect(after.subtotal).toEqual(money("200.00"));
      expect(after.totalQuantity).toBe(4);
    });

    it("removes the line at quantity 0, matching the API", () => {
      const before = cart([line({ id: "1", variantId: "v1" }), line({ id: "2", variantId: "v2" })]);

      const after = cartReducer(before, { type: "setQuantity", lineId: "1", quantity: 0 });

      expect(after.lines.map((l) => l.id)).toEqual(["2"]);
    });

    it("clamps above the maximum", () => {
      const before = cart([line({ id: "1", variantId: "v1" })]);

      const after = cartReducer(before, { type: "setQuantity", lineId: "1", quantity: 99 });

      expect(after.lines[0]?.quantity).toBe(MAX_QUANTITY);
    });

    it("ignores an unknown line id", () => {
      const before = cart([line({ id: "1", variantId: "v1", quantity: 2 })]);

      const after = cartReducer(before, { type: "setQuantity", lineId: "nope", quantity: 5 });

      expect(after.lines[0]?.quantity).toBe(2);
      expect(after.totalQuantity).toBe(2);
    });
  });

  describe("remove", () => {
    it("drops the line and recomputes the totals", () => {
      const before = cart([
        line({ id: "1", variantId: "v1", quantity: 2, unitPrice: money("10.00") }),
        line({ id: "2", variantId: "v2", quantity: 1, unitPrice: money("30.00") }),
      ]);

      const after = cartReducer(before, { type: "remove", lineId: "1" });

      expect(after.lines.map((l) => l.id)).toEqual(["2"]);
      expect(after.subtotal).toEqual(money("30.00"));
      expect(after.totalQuantity).toBe(1);
    });

    it("empties the cart down to a zero subtotal while keeping its identity", () => {
      const before = cart([line({ id: "1", variantId: "v1", unitPrice: money("10.00") })]);

      const after = cartReducer(before, { type: "remove", lineId: "1" });

      expect(after.lines).toEqual([]);
      expect(after.subtotal).toEqual(money("0.00"));
      expect(after.totalQuantity).toBe(0);
      // Fact 14: an emptied cart stays usable, so the id and checkout link survive.
      expect(after.id).toBe(before.id);
      expect(after.checkoutUrl).toBe(before.checkoutUrl);
    });

    it("ignores an unknown line id", () => {
      const before = cart([line({ id: "1", variantId: "v1" })]);

      expect(cartReducer(before, { type: "remove", lineId: "nope" }).lines).toHaveLength(1);
    });
  });

  describe("purity", () => {
    // PR #14 shipped a shared mutable `EMPTY_FACETS` that leaked between requests. The
    // reducer runs on state React reuses across renders, so this is asserted, not assumed.
    it.each([
      ["add", { type: "add", line: newLine }],
      ["setQuantity", { type: "setQuantity", lineId: "1", quantity: 7 }],
      ["remove", { type: "remove", lineId: "1" }],
    ] as const)("does not mutate its input on %s", (_name, intent) => {
      const before = cart([line({ id: "1", variantId: "v1", quantity: 2 })]);
      const snapshot = structuredClone(before);

      const after = cartReducer(before, intent);

      expect(before).toEqual(snapshot);
      expect(after).not.toBe(before);
      expect(after.lines).not.toBe(before.lines);
    });

    it("does not reuse line objects it changed", () => {
      const before = cart([line({ id: "1", variantId: "v1", quantity: 2 })]);

      const after = cartReducer(before, { type: "setQuantity", lineId: "1", quantity: 3 });

      expect(after.lines[0]).not.toBe(before.lines[0]);
    });
  });

  describe("money arithmetic", () => {
    it("keeps a subtotal exact across amounts that lose precision as floats", () => {
      // 0.1 + 0.2 in binary floating point is 0.30000000000000004.
      const before = cart([]);
      const withFirst = cartReducer(before, {
        type: "add",
        line: { ...newLine, variantId: "v1", unitPrice: money("0.10") },
      });

      const after = cartReducer(withFirst, {
        type: "add",
        line: { ...newLine, variantId: "v2", unitPrice: money("0.20") },
      });

      expect(after.subtotal.amount).toBe("0.30");
    });

    it("sums mixed prices and quantities", () => {
      const before = cart([
        line({ id: "1", variantId: "v1", quantity: 3, unitPrice: money("485.00") }),
        line({ id: "2", variantId: "v2", quantity: 2, unitPrice: money("249.00") }),
      ]);

      // Same arithmetic the live API returned for this pair: 1455 + 498.
      const after = cartReducer(before, { type: "setQuantity", lineId: "1", quantity: 3 });

      expect(after.subtotal).toEqual(money("1953.00"));
      expect(after.totalQuantity).toBe(5);
    });

    it("keeps the cart's currency when the last line goes", () => {
      const before = cart([line({ id: "1", variantId: "v1" })]);

      const after = cartReducer(before, { type: "remove", lineId: "1" });

      expect(after.subtotal.currencyCode).toBe(USD);
    });
  });
});
