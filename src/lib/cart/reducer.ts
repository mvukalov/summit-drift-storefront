import type { Money } from "@/types/catalog";
import type { Cart, CartLine } from "@/types/cart";
import { clampQuantity } from "./limits";

/**
 * A line being added, before the server has given it an id or a total.
 *
 * The caller supplies it from data it already has (the selected variant on the product page),
 * so an add needs no round-trip before the UI updates.
 */
export type NewCartLine = Omit<CartLine, "id" | "lineTotal">;

export type CartIntent =
  | { type: "add"; line: NewCartLine }
  | { type: "setQuantity"; lineId: string; quantity: number }
  | { type: "remove"; lineId: string };

/** Marks a line the server has not acknowledged yet. */
const OPTIMISTIC_PREFIX = "optimistic:";

/** The placeholder id an optimistic line carries until the real cart replaces it wholesale. */
export function optimisticLineId(variantId: string): string {
  return `${OPTIMISTIC_PREFIX}${variantId}`;
}

export function isOptimisticLine(lineId: string): boolean {
  return lineId.startsWith(OPTIMISTIC_PREFIX);
}

// Money arrives as a decimal string ("249.0"). Arithmetic goes through integer cents so a
// subtotal can't accumulate binary-floating-point dust across lines, and comes back out with
// two decimals. Display always goes through `formatMoney`, so the exact string the API would
// have used ("1953.0" vs "1953.00") never reaches the screen.
function toCents(money: Money): number {
  return Math.round(Number(money.amount) * 100);
}

function fromCents(cents: number, currencyCode: Money["currencyCode"]): Money {
  return { amount: (cents / 100).toFixed(2), currencyCode };
}

function lineTotalFor(unitPrice: Money, quantity: number): Money {
  return fromCents(toCents(unitPrice) * quantity, unitPrice.currencyCode);
}

/**
 * Recomputes the totals from the lines.
 *
 * The subtotal is derived, never patched: `cost.subtotalAmount` was verified to equal
 * `Σ (amountPerQuantity × quantity)` exactly on the live API, so an optimistic subtotal
 * computed this way cannot drift from what the server will report.
 */
function withTotals(cart: Cart, lines: CartLine[]): Cart {
  const currencyCode = lines[0]?.unitPrice.currencyCode ?? cart.subtotal.currencyCode;
  const cents = lines.reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0);

  return {
    ...cart,
    lines,
    subtotal: fromCents(cents, currencyCode),
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

/**
 * Applies one intent to a cart and returns a new cart.
 *
 * Pure by design: React runs it as the `useOptimistic` reducer in the browser, and unit tests
 * call it directly with no React involved. It never mutates its argument — a shared mutable
 * value leaking across requests was the bug review caught in PR #14.
 *
 * Each rule below is traceable to observed API behaviour (`docs/cart.md`, verified facts).
 */
export function cartReducer(cart: Cart, intent: CartIntent): Cart {
  switch (intent.type) {
    case "add": {
      const { line } = intent;
      const existing = cart.lines.find((candidate) => candidate.variantId === line.variantId);

      // `cartLinesAdd` increments an existing line rather than creating a second one, so the
      // optimistic view merges the same way.
      if (existing) {
        const quantity = clampQuantity(existing.quantity + line.quantity);
        // Updating a line leaves its position alone, as the API does.
        return withTotals(
          cart,
          cart.lines.map((candidate) =>
            candidate.id === existing.id
              ? { ...candidate, quantity, lineTotal: lineTotalFor(candidate.unitPrice, quantity) }
              : candidate,
          ),
        );
      }

      // The clamp here is defensive only. An over-limit add is refused by `canAddToLine`
      // before anything is dispatched (decision 4), so this should never be what the user
      // sees — if it is, a caller skipped the guard.
      const quantity = clampQuantity(line.quantity);
      const added: CartLine = {
        ...line,
        id: optimisticLineId(line.variantId),
        quantity,
        lineTotal: lineTotalFor(line.unitPrice, quantity),
      };

      // Prepended, because the API returns lines newest-first. Appending would make the list
      // visibly re-sort the moment the real cart arrived.
      return withTotals(cart, [added, ...cart.lines]);
    }

    case "setQuantity": {
      // Quantity 0 deletes the line on the API, so the stepper's lower bound and the remove
      // button converge on one behaviour here too.
      if (intent.quantity < 1) {
        return cartReducer(cart, { type: "remove", lineId: intent.lineId });
      }

      const quantity = clampQuantity(intent.quantity);
      return withTotals(
        cart,
        cart.lines.map((line) =>
          line.id === intent.lineId
            ? { ...line, quantity, lineTotal: lineTotalFor(line.unitPrice, quantity) }
            : line,
        ),
      );
    }

    case "remove":
      return withTotals(
        cart,
        cart.lines.filter((line) => line.id !== intent.lineId),
      );
  }
}
