import { vi } from "vitest";
import type { CartActionResult } from "@/lib/cart/actions";
import type { Cart } from "@/types/cart";

/**
 * Test doubles for the cart Server Actions.
 *
 * Component tests mock this boundary rather than the network. With the cart behind Server
 * Actions the browser makes no GraphQL request at all, so there is nothing for MSW to
 * intercept: the action *is* the seam between the UI and the server. Mocking it also keeps
 * the RSC-only Apollo client out of the jsdom bundle, which cannot load there.
 *
 * Used from a test file as:
 * `vi.mock("@/lib/cart/actions", () => import("@/test/cart-actions"));`
 *
 * This module deliberately imports no component: `CartProvider` imports the real actions
 * module, so a mock that pulled the provider in would deadlock on a circular import.
 */
export const addToCart =
  vi.fn<(variantId: string, quantity: number) => Promise<CartActionResult>>();
export const updateCartLine =
  vi.fn<(lineId: string, quantity: number) => Promise<CartActionResult>>();
export const removeCartLine = vi.fn<(lineId: string) => Promise<CartActionResult>>();

/** Clears call history and makes every action succeed with `cart`. */
export function resetCartActions(cart: Cart): void {
  for (const action of [addToCart, updateCartLine, removeCartLine]) {
    action.mockReset();
  }
  addToCart.mockResolvedValue({ ok: true, cart });
  updateCartLine.mockResolvedValue({ ok: true, cart });
  removeCartLine.mockResolvedValue({ ok: true, cart });
}
