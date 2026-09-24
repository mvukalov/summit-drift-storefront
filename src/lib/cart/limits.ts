import type { Cart } from "@/types/cart";

// The API accepts any quantity and reports `quantityAvailable: null` on every variant
// (project overview §2): `cartLinesUpdate` to 9999 succeeded with no `userErrors`. The 1-10
// ceiling is therefore entirely a frontend rule, which is why it lives in one pure module
// that both the client and the Server Action call.

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 10;

export type AddRefusal = "at-maximum";

export type AddCheck =
  | { ok: true; quantity: number }
  | { ok: false; reason: AddRefusal; /** What the line already holds. */ current: number };

/** Constrains a quantity to the allowed range. Non-finite input falls back to `MIN_QUANTITY`. */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return MIN_QUANTITY;
  const whole = Math.trunc(quantity);
  if (whole < MIN_QUANTITY) return MIN_QUANTITY;
  if (whole > MAX_QUANTITY) return MAX_QUANTITY;
  return whole;
}

/**
 * Whether `requested` more of `variantId` may be added, and the absolute quantity the line
 * would then hold.
 *
 * Decision 4 (`docs/cart.md`): an add that would cross `MAX_QUANTITY` is **refused
 * outright** — not clamped down to the ceiling and not partially applied. Adding 5 to a line
 * of 8 fails; it does not silently land on 10. The reasoning is that a clamp makes the
 * button lie: the user asked for 13 and would be told "added" while getting 10.
 *
 * Called in two places with the same semantics. The client asks first, against the cart in
 * context, so a refusal costs no request and nothing is dispatched that would have to roll
 * back. The Server Action asks again against a freshly read cart, because the client's view
 * of the cart is not a trusted source.
 */
export function canAddToLine(cart: Cart, variantId: string, requested: number): AddCheck {
  const current = cart.lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
  const total = current + requested;

  if (requested < MIN_QUANTITY || total > MAX_QUANTITY) {
    return { ok: false, reason: "at-maximum", current };
  }
  return { ok: true, quantity: total };
}

/** The refusal message shown to the user. Shared so client and server word it identically. */
export function addRefusalMessage(): string {
  return `You can have at most ${MAX_QUANTITY} of this item in the cart.`;
}
