import "server-only";
import type { ApolloClient } from "@apollo/client";
import { CartByIdDocument } from "@/lib/graphql/generated/graphql";
import { query } from "@/lib/graphql/rsc-client";
import type { Cart } from "@/types/cart";
import { readCartId } from "./cookie";
import { emptyCart, toCart } from "./mappers";

// Reads live here rather than in `actions.ts` on purpose: every export of a `"use server"`
// module becomes a public POST endpoint, and a cart read has no reason to be one.

/**
 * The cart is per-visitor and changes on every mutation, so it must never come from the
 * Next.js data cache. The RSC client caches POSTs by default (`force-cache`, for catalog
 * data), so this override is load-bearing rather than decorative.
 */
export const CART_FETCH_CONTEXT = { fetchOptions: { cache: "no-store" } } as const;

// `no-cache` as well as `no-store`: the visitor's cart has no business in Apollo's
// normalized cache either, and the raw response is always what the mapper should see.
const CART_QUERY_OPTIONS = {
  query: CartByIdDocument,
  context: CART_FETCH_CONTEXT,
  fetchPolicy: "no-cache",
} as const;

/**
 * The cart behind an id, read with a caller-supplied client.
 *
 * Server Actions must use this rather than `getCart`: Apollo's `query` shortcut builds a new
 * client on each call, which in an action would mean a separate client per operation. An
 * action creates one client and threads it through instead.
 */
export async function getCartWith(client: ApolloClient, cartId: string): Promise<Cart | null> {
  const { data } = await client.query({ ...CART_QUERY_OPTIONS, variables: { id: cartId } });
  // An unusable id returns `cart: null` with no GraphQL error, so recovery is a null check.
  return data?.cart ? toCart(data.cart) : null;
}

/** The cart behind an id. For Server Components; actions use `getCartWith`. */
export async function getCart(cartId: string): Promise<Cart | null> {
  const { data } = await query({ ...CART_QUERY_OPTIONS, variables: { id: cartId } });
  return data?.cart ? toCart(data.cart) : null;
}

/**
 * The current visitor's cart, for Server Components.
 *
 * Always resolves to a usable `Cart`: no cookie, a dead id, or a failing request all render
 * as empty. A failed cart read deliberately does not propagate — the cart is read in the
 * root layout, so throwing would replace every page on the site with an error boundary over
 * a header badge. An empty cart plus a working page is the better failure.
 */
export async function getCartFromCookie(): Promise<Cart> {
  const cartId = await readCartId();
  if (!cartId) return emptyCart();

  try {
    return (await getCart(cartId)) ?? emptyCart();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Cart read failed; rendering an empty cart.", error);
    }
    return emptyCart();
  }
}
