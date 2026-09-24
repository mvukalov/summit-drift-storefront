import type { Image, Money, SelectedOption } from "./catalog";

// Domain types for the cart, derived from the generated GraphQL types in the same way as
// `catalog.ts`: mapped at the boundary in `src/lib/cart/mappers.ts` so no `__typename` and
// no GraphQL shape reaches a component.

export interface CartLine {
  /** The `CartLine` id, which mutations address. Optimistic lines carry a placeholder. */
  id: string;
  /** The variant this line holds, and the key `add` merges on. */
  variantId: string;
  /** The product title. The variant's option summary lives in `options`. */
  title: string;
  options: SelectedOption[];
  image: Image | null;
  quantity: number;
  /**
   * Price for one unit, from `cost.amountPerQuantity`.
   *
   * An addition to the shape sketched in `project-overview.md` §7 (approved, `docs/cart.md`
   * decision 3). Without it the reducer cannot recompute a subtotal for an optimistic
   * quantity change and would have to display a stale one.
   */
  unitPrice: Money;
  /** `unitPrice × quantity`, recomputed rather than patched. */
  lineTotal: Money;
}

export interface Cart {
  id: string;
  /** Newest line first, matching the order the API returns. */
  lines: CartLine[];
  subtotal: Money;
  totalQuantity: number;
  checkoutUrl: string;
}
