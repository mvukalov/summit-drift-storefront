import "server-only";
import { cookies } from "next/headers";

export const CART_COOKIE = "cart_id";

// Below Shopify's cart retention window, which this API doesn't document. The exact value
// barely matters: a stale id reads back as `cart: null`, so the worst case is a fresh cart.
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * The cart id from the request, or `null`.
 *
 * The id is a bearer token — it carries the `?key=` that authorizes access to that cart — so
 * the cookie is httpOnly and this is the only way any code obtains it. Reading it makes the
 * calling route dynamic, which is why `/` is no longer statically prerendered.
 */
export async function readCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/**
 * Persists a newly created cart's id.
 *
 * Only callable from a Server Action or Route Handler: cookies cannot be set once a response
 * has started streaming. Next URI-encodes the value on write and decodes it on read, so the
 * `://` and `?key=` in the id round-trip without manual encoding (verified 2026-09-24).
 */
export async function writeCartId(id: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}
