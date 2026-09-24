import type { CartActionResult } from "@/lib/cart/actions";

/**
 * Browser-safe stand-in for the cart Server Actions, used by Storybook.
 *
 * Stories render the drawer in a real browser, where the real module cannot be imported: it
 * is a `"use server"` module whose transitive imports are server-only. Storybook aliases the
 * actions to this file (see `.storybook/main.ts`), so the drawer's own rendering, states and
 * accessibility can be reviewed without a server.
 *
 * Every call reports success without changing anything, so a story stays on the cart its args
 * describe instead of drifting as reviewers click.
 */
async function unchanged(): Promise<CartActionResult> {
  return { ok: false, error: "Cart changes are not wired up in Storybook." };
}

export const addToCart = unchanged;
export const updateCartLine = unchanged;
export const removeCartLine = unchanged;
