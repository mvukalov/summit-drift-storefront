import { render, type RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/organisms/CartProvider/CartProvider";
import type { Cart, CartLine } from "@/types/cart";
import type { Money } from "@/types/catalog";

// Cart fixtures and render helpers. The Server Action doubles live in `cart-actions.ts`,
// which imports no component so it can be used as a `vi.mock` factory without a cycle.
export * from "./cart-actions";
export { stubDialog, unstubDialog } from "./dialog";

export function money(amount: string): Money {
  return { amount, currencyCode: "USD" };
}

export function testLine(overrides: Partial<CartLine> = {}): CartLine {
  const quantity = overrides.quantity ?? 1;
  const unitPrice = overrides.unitPrice ?? money("100.00");

  return {
    id: "gid://shopify/CartLine/1",
    variantId: "gid://shopify/ProductVariant/1",
    title: "Ripstop Shell Jacket",
    options: [
      { name: "color", value: "slate" },
      { name: "size", value: "M" },
    ],
    image: null,
    quantity,
    unitPrice,
    lineTotal: money((Number(unitPrice.amount) * quantity).toFixed(2)),
    ...overrides,
  };
}

export function testCart(lines: CartLine[] = []): Cart {
  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.unitPrice.amount) * line.quantity,
    0,
  );

  return {
    id: "gid://shopify/Cart/c1-test?key=abc",
    lines,
    subtotal: money(subtotal.toFixed(2)),
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    checkoutUrl: "https://apparel-outdoor.hydrogen.mock.shop/checkout",
  };
}

/** Renders inside a `CartProvider` seeded with `cart`. */
export function renderWithCart(ui: ReactNode, cart: Cart = testCart()): RenderResult {
  return render(<CartProvider initialCart={cart}>{ui}</CartProvider>);
}
