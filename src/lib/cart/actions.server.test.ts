import { HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CartByIdDocument,
  CartCreateDocument,
  CartLinesAddDocument,
  CartLinesRemoveDocument,
} from "@/lib/graphql/generated/graphql";
import { cartByIdFixture } from "@/test/msw/fixtures/cart";
import { cartPayload, shop } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { MAX_QUANTITY } from "./limits";

// The cart id lives in an httpOnly cookie and is never a parameter, so the cookie store is
// what these tests drive. `vi.hoisted` because the mock factory runs before the module body.
const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieJar.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set: (name: string, value: string) => cookieJar.set(name, value),
    }),
}));

const { addToCart, removeCartLine, updateCartLine } = await import("./actions");

const FIXTURE_CART = cartByIdFixture.cart;
/** The variant on the fixture's newest line, which already holds 3. */
const LINE_VARIANT = "gid://shopify/ProductVariant/9745";
const LINE_ID = "gid://shopify/CartLine/14265";
const NEW_VARIANT = "gid://shopify/ProductVariant/1111";
const EXISTING_CART_ID = FIXTURE_CART.id;

/**
 * Records the variables one cart operation was called with, and answers with the fixture.
 *
 * Keyed by operation name rather than by document, so one helper can stand in for four
 * mutations whose generated variable types have nothing in common.
 */
const PAYLOAD_KEY = {
  CartCreate: "cartCreate",
  CartLinesAdd: "cartLinesAdd",
  CartLinesUpdate: "cartLinesUpdate",
  CartLinesRemove: "cartLinesRemove",
} as const;

const PAYLOAD_TYPENAME = {
  CartCreate: "CartCreatePayload",
  CartLinesAdd: "CartLinesAddPayload",
  CartLinesUpdate: "CartLinesUpdatePayload",
  CartLinesRemove: "CartLinesRemovePayload",
} as const;

type CartOperation = keyof typeof PAYLOAD_KEY;

function spyOn(operation: CartOperation): Record<string, unknown>[] {
  const calls: Record<string, unknown>[] = [];

  server.use(
    shop.mutation(operation, ({ variables }) => {
      calls.push(variables);
      return HttpResponse.json({
        data: { [PAYLOAD_KEY[operation]]: cartPayload(PAYLOAD_TYPENAME[operation]) },
      });
    }),
  );
  return calls;
}

beforeEach(() => {
  cookieJar.clear();
});

describe("addToCart", () => {
  it("creates a cart and stores its id when there is no cookie", async () => {
    const creates = spyOn("CartCreate");

    const result = await addToCart(NEW_VARIANT, 2);

    expect(result).toMatchObject({ ok: true });
    expect(creates).toHaveLength(1);
    expect(creates[0]).toEqual({
      input: { lines: [{ merchandiseId: NEW_VARIANT, quantity: 2 }] },
    });
    // The cookie is written only on create, and only after the mutation succeeded.
    expect(cookieJar.get("cart_id")).toBe(FIXTURE_CART.id);
  });

  it("does not write a cookie when creating the cart fails", async () => {
    server.use(
      shop.mutation(CartCreateDocument, () =>
        HttpResponse.json({
          data: {
            cartCreate: cartPayload("CartCreatePayload", [
              {
                code: "INVALID_MERCHANDISE_LINE",
                field: ["lines", "0", "merchandiseId"],
                message: "raw",
                __typename: "CartUserError",
              },
            ]),
          },
        }),
      ),
    );

    const result = await addToCart("gid://shopify/ProductVariant/nope", 1);

    expect(result).toEqual({ ok: false, error: "That option is no longer available." });
    expect(cookieJar.has("cart_id")).toBe(false);
  });

  it("adds a variant that is not in the cart with cartLinesAdd", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    const adds = spyOn("CartLinesAdd");

    const result = await addToCart(NEW_VARIANT, 2);

    expect(result).toMatchObject({ ok: true });
    expect(adds[0]).toEqual({
      cartId: EXISTING_CART_ID,
      lines: [{ merchandiseId: NEW_VARIANT, quantity: 2 }],
    });
  });

  // The ceiling can only be enforced with an absolute quantity, because `cartLinesAdd` is
  // additive. This is the assertion that keeps that property honest.
  it("updates an existing line to an absolute quantity instead of adding to it", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    const updates = spyOn("CartLinesUpdate");
    const adds = spyOn("CartLinesAdd");

    const result = await addToCart(LINE_VARIANT, 2);

    expect(result).toMatchObject({ ok: true });
    expect(adds).toHaveLength(0);
    // The line held 3, so 3 + 2 is sent as an absolute 5.
    expect(updates[0]).toEqual({
      cartId: EXISTING_CART_ID,
      lines: [{ id: LINE_ID, quantity: 5 }],
    });
  });

  it("refuses an add that would cross the maximum, and mutates nothing", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    const updates = spyOn("CartLinesUpdate");
    const adds = spyOn("CartLinesAdd");

    // The line holds 3; asking for 9 would reach 12.
    const result = await addToCart(LINE_VARIANT, 9);

    expect(result).toEqual({
      ok: false,
      error: `You can have at most ${MAX_QUANTITY} of this item in the cart.`,
    });
    // Decision 4: refused outright. No clamping follow-up, no partial add.
    expect(updates).toHaveLength(0);
    expect(adds).toHaveLength(0);
  });

  it("re-checks the ceiling against the server's cart, not the caller's claim", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    // The server says this line already holds the maximum, whatever the client believed.
    server.use(
      shop.query(CartByIdDocument, () =>
        HttpResponse.json({
          data: {
            cart: {
              ...FIXTURE_CART,
              lines: {
                ...FIXTURE_CART.lines,
                nodes: [
                  {
                    ...FIXTURE_CART.lines.nodes[0]!,
                    quantity: MAX_QUANTITY,
                  },
                ],
              },
            },
          },
        }),
      ),
    );
    const updates = spyOn("CartLinesUpdate");

    const result = await addToCart(LINE_VARIANT, 1);

    expect(result).toMatchObject({ ok: false });
    expect(updates).toHaveLength(0);
  });

  it("clamps a caller's out-of-range quantity rather than trusting it", async () => {
    const creates = spyOn("CartCreate");

    await addToCart(NEW_VARIANT, 9999);

    expect(creates[0]).toMatchObject({
      input: { lines: [{ merchandiseId: NEW_VARIANT, quantity: MAX_QUANTITY }] },
    });
  });

  it("starts a fresh cart when the cookie's id is dead", async () => {
    cookieJar.set("cart_id", "gid://shopify/Cart/gone");
    // Fact 13: an unusable id reads back as null with no GraphQL error.
    server.use(shop.query(CartByIdDocument, () => HttpResponse.json({ data: { cart: null } })));
    const creates = spyOn("CartCreate");

    const result = await addToCart(NEW_VARIANT, 1);

    expect(result).toMatchObject({ ok: true });
    expect(creates).toHaveLength(1);
    expect(cookieJar.get("cart_id")).toBe(FIXTURE_CART.id);
  });

  it("starts a fresh cart when the cart dies between the read and the write", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    // Fact 12: mutating a dead cart answers with INVALID on the cartId field.
    server.use(
      shop.mutation(CartLinesAddDocument, () =>
        HttpResponse.json({
          data: {
            cartLinesAdd: cartPayload("CartLinesAddPayload", [
              {
                code: "INVALID",
                field: ["cartId"],
                message: "The specified cart does not exist.",
                __typename: "CartUserError",
              },
            ]),
          },
        }),
      ),
    );
    const creates = spyOn("CartCreate");

    const result = await addToCart(NEW_VARIANT, 1);

    // The user's click succeeds rather than surfacing an error they can't act on.
    expect(result).toMatchObject({ ok: true });
    expect(creates).toHaveLength(1);
  });

  it("returns a generic message on a network failure, never the raw error", async () => {
    server.use(shop.mutation(CartCreateDocument, () => HttpResponse.error()));

    const result = await addToCart(NEW_VARIANT, 1);

    expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
  });

  it("maps an unrecognised userErrors code to the generic message", async () => {
    server.use(
      shop.mutation(CartCreateDocument, () =>
        HttpResponse.json({
          data: {
            cartCreate: cartPayload("CartCreatePayload", [
              {
                code: "VALIDATION_CUSTOM",
                field: null,
                message: "Some internal detail we must not show",
                __typename: "CartUserError",
              },
            ]),
          },
        }),
      ),
    );

    const result = await addToCart(NEW_VARIANT, 1);

    expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
  });

  it("treats a success-shaped response with no cart as a failure", async () => {
    server.use(
      shop.mutation(CartCreateDocument, () =>
        HttpResponse.json({
          data: { cartCreate: { __typename: "CartCreatePayload", cart: null, userErrors: [] } },
        }),
      ),
    );

    expect(await addToCart(NEW_VARIANT, 1)).toMatchObject({ ok: false });
  });
});

describe("updateCartLine", () => {
  it("sends an absolute quantity", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    const updates = spyOn("CartLinesUpdate");

    const result = await updateCartLine(LINE_ID, 4);

    expect(result).toMatchObject({ ok: true });
    expect(updates[0]).toEqual({ cartId: EXISTING_CART_ID, lines: [{ id: LINE_ID, quantity: 4 }] });
  });

  it("clamps above the maximum", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    const updates = spyOn("CartLinesUpdate");

    await updateCartLine(LINE_ID, 50);

    expect(updates[0]).toMatchObject({ lines: [{ id: LINE_ID, quantity: MAX_QUANTITY }] });
  });

  it("removes the line at quantity 0 instead of updating it", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    const removes = spyOn("CartLinesRemove");
    const updates = spyOn("CartLinesUpdate");

    const result = await updateCartLine(LINE_ID, 0);

    expect(result).toMatchObject({ ok: true });
    expect(removes[0]).toEqual({ cartId: EXISTING_CART_ID, lineIds: [LINE_ID] });
    expect(updates).toHaveLength(0);
  });

  it("fails without touching the API when there is no cart cookie", async () => {
    const updates = spyOn("CartLinesUpdate");

    const result = await updateCartLine(LINE_ID, 2);

    expect(result).toMatchObject({ ok: false });
    expect(updates).toHaveLength(0);
  });
});

describe("removeCartLine", () => {
  it("removes by line id", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    const removes = spyOn("CartLinesRemove");

    const result = await removeCartLine(LINE_ID);

    expect(result).toMatchObject({ ok: true });
    expect(removes[0]).toEqual({ cartId: EXISTING_CART_ID, lineIds: [LINE_ID] });
  });

  it("maps a dead line id to a user-facing message", async () => {
    cookieJar.set("cart_id", EXISTING_CART_ID);
    server.use(
      shop.mutation(CartLinesRemoveDocument, () =>
        HttpResponse.json({
          data: {
            cartLinesRemove: cartPayload("CartLinesRemovePayload", [
              {
                code: "INVALID",
                field: ["lineIds", "0"],
                message: "The cart line does not exist.",
                __typename: "CartUserError",
              },
            ]),
          },
        }),
      ),
    );

    const result = await removeCartLine("gid://shopify/CartLine/gone");

    expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
  });

  it("fails without touching the API when there is no cart cookie", async () => {
    const removes = spyOn("CartLinesRemove");

    expect(await removeCartLine(LINE_ID)).toMatchObject({ ok: false });
    expect(removes).toHaveLength(0);
  });
});
