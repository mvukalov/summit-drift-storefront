"use server";

import type { ApolloClient, TypedDocumentNode } from "@apollo/client";
import {
  CartCreateDocument,
  CartLinesAddDocument,
  CartLinesRemoveDocument,
  CartLinesUpdateDocument,
  type CartFragment,
  type CartUserErrorFragment,
} from "@/lib/graphql/generated/graphql";
import { getClient } from "@/lib/graphql/rsc-client";
import type { Cart } from "@/types/cart";
import { readCartId, writeCartId } from "./cookie";
import { CART_FETCH_CONTEXT, getCartWith } from "./fetchers";
import { addRefusalMessage, canAddToLine, clampQuantity, MIN_QUANTITY } from "./limits";
import { toCart } from "./mappers";

/**
 * Cart mutations.
 *
 * Every function here follows the rule the Next.js security guide sets out for Server
 * Actions: take a reference plus the user's change, and re-read everything else from a
 * trusted source. The trusted source is the httpOnly cookie, so **the cart id is never a
 * parameter** — a caller can only ever act on its own cart.
 *
 * None of these revalidate. The cart is not part of any cached page data, so the returned
 * cart advancing the provider's base state is both cheaper and more precise than
 * re-rendering the route (`docs/cart.md`).
 */
export type CartActionResult = { ok: true; cart: Cart } | { ok: false; error: string };

/** Shown when there is nothing more specific and nothing worth exposing. */
const GENERIC_ERROR = "Something went wrong. Please try again.";

// The API's own `userErrors` messages are written for developers ("The specified cart does
// not exist."), so they are mapped rather than displayed. Anything unrecognised falls back to
// the generic message, so a new code can never leak an internal string into the UI.
function messageFor(errors: CartUserErrorFragment[]): string {
  const code = errors[0]?.code;
  switch (code) {
    // Verified live: a bad `merchandiseId` answers with this code.
    case "INVALID_MERCHANDISE_LINE":
    case "MERCHANDISE_NOT_APPLICABLE":
      return "That option is no longer available.";
    case "CART_TOO_LARGE":
      return "Your cart is full. Remove an item to add another.";
    default:
      return GENERIC_ERROR;
  }
}

/** A dead or expired cart id, which is recoverable by starting a new cart. */
function isDeadCart(errors: CartUserErrorFragment[]): boolean {
  return errors.some((error) => error.code === "INVALID" && error.field?.includes("cartId"));
}

type CartPayload = {
  cart: CartFragment | null;
  userErrors: CartUserErrorFragment[];
};

/**
 * `deadCart` is internal: it selects the recovery path and is stripped before the result
 * reaches the client, which has no use for it and no business knowing the cart died.
 */
type MutationOutcome = CartActionResult & { deadCart?: boolean };

/** Drops the internal flag, so an action's contract is exactly `CartActionResult`. */
function toResult(outcome: MutationOutcome): CartActionResult {
  return outcome.ok ? { ok: true, cart: outcome.cart } : { ok: false, error: outcome.error };
}

/**
 * Runs one cart mutation and normalizes the three ways it can fail: a rejected request, a
 * `userErrors` entry, and a success-shaped response with no cart.
 */
async function runMutation<TData, TVariables extends Record<string, unknown>>(
  client: ApolloClient,
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  select: (data: TData) => CartPayload | null | undefined,
): Promise<MutationOutcome> {
  let data: TData | null | undefined;

  try {
    const result = await client.mutate({
      mutation: document,
      variables,
      // A mutation must never be served from the data cache.
      context: CART_FETCH_CONTEXT,
      fetchPolicy: "no-cache",
    });
    data = result.data;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Cart mutation failed.", error);
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  const payload = data ? select(data) : null;
  if (!payload) return { ok: false, error: GENERIC_ERROR };

  // `userErrors` is checked as carefully as the network result: the API answers 200 with a
  // populated `userErrors` array and a null cart.
  if (payload.userErrors.length > 0) {
    return {
      ok: false,
      error: messageFor(payload.userErrors),
      deadCart: isDeadCart(payload.userErrors),
    };
  }
  if (!payload.cart) return { ok: false, error: GENERIC_ERROR };

  return { ok: true, cart: toCart(payload.cart) };
}

/**
 * Creates a cart holding one line and stores its id.
 *
 * The cookie is written here and nowhere else, which is why only the first add of a session
 * triggers the cookie write's automatic re-render of the current route. That re-render is
 * harmless and **not load-bearing**: the provider ignores later `initialCart` props and takes
 * its state from this function's return value.
 */
async function createCartWithLine(
  client: ApolloClient,
  variantId: string,
  quantity: number,
): Promise<CartActionResult> {
  const outcome = await runMutation(
    client,
    CartCreateDocument,
    { input: { lines: [{ merchandiseId: variantId, quantity }] } },
    (data) => data.cartCreate,
  );

  if (outcome.ok) await writeCartId(outcome.cart.id);
  return toResult(outcome);
}

/**
 * Adds `quantity` of a variant to the cart, creating the cart if there isn't one.
 *
 * Refuses rather than clamps when the line would cross `MAX_QUANTITY` (decision 4). The
 * client checks the same guard first, so this refusal is the trust boundary rather than the
 * UX: it costs one extra read of the current cart, which is the price of not clamping.
 */
export async function addToCart(variantId: string, quantity: number): Promise<CartActionResult> {
  const requested = clampQuantity(quantity);
  const cartId = await readCartId();
  // One client for the whole action: Apollo's `query` shortcut would build a separate client
  // per call here, which is exactly what its own warning tells you not to do in an action.
  const client = getClient();

  // No cart yet, so nothing can be over the limit.
  if (!cartId) return createCartWithLine(client, variantId, requested);

  const current = await getCartWith(client, cartId);
  if (!current) return createCartWithLine(client, variantId, requested);

  const check = canAddToLine(current, variantId, requested);
  if (!check.ok) return { ok: false, error: addRefusalMessage() };

  const existing = current.lines.find((line) => line.variantId === variantId);

  // `cartLinesAdd` is additive, so an existing line is set to its absolute target instead.
  // That is the only form that cannot overshoot the ceiling, and it is safe to retry.
  const outcome = existing
    ? await runMutation(
        client,
        CartLinesUpdateDocument,
        { cartId, lines: [{ id: existing.id, quantity: check.quantity }] },
        (data) => data.cartLinesUpdate,
      )
    : await runMutation(
        client,
        CartLinesAddDocument,
        { cartId, lines: [{ merchandiseId: variantId, quantity: check.quantity }] },
        (data) => data.cartLinesAdd,
      );

  // The cart died between the read and the write: start a fresh one rather than failing a
  // click the user can't do anything about.
  if (!outcome.ok && outcome.deadCart) return createCartWithLine(client, variantId, requested);

  return toResult(outcome);
}

/**
 * Sets a line's absolute quantity. Below the minimum removes the line, as the API does at
 * quantity 0, so the stepper's lower bound and the remove button agree.
 */
export async function updateCartLine(lineId: string, quantity: number): Promise<CartActionResult> {
  if (quantity < MIN_QUANTITY) return removeCartLine(lineId);

  const cartId = await readCartId();
  if (!cartId) return { ok: false, error: GENERIC_ERROR };

  return toResult(
    await runMutation(
      getClient(),
      CartLinesUpdateDocument,
      { cartId, lines: [{ id: lineId, quantity: clampQuantity(quantity) }] },
      (data) => data.cartLinesUpdate,
    ),
  );
}

export async function removeCartLine(lineId: string): Promise<CartActionResult> {
  const cartId = await readCartId();
  if (!cartId) return { ok: false, error: GENERIC_ERROR };

  return toResult(
    await runMutation(
      getClient(),
      CartLinesRemoveDocument,
      { cartId, lineIds: [lineId] },
      (data) => data.cartLinesRemove,
    ),
  );
}
