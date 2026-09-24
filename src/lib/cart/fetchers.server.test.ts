import { InMemoryCache } from "@apollo/client";
import { HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { CartByIdDocument } from "@/lib/graphql/generated/graphql";
import { POSSIBLE_TYPES } from "@/lib/graphql/config";
import { cartByIdFixture } from "@/test/msw/fixtures/cart";
import { shop } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

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

const { getCart, getCartFromCookie } = await import("./fetchers");

const CART_ID = cartByIdFixture.cart.id;

describe("getCart", () => {
  it("maps a cart read by id", async () => {
    const cart = await getCart(CART_ID);

    expect(cart?.lines).toHaveLength(2);
    expect(cart?.totalQuantity).toBe(5);
  });

  it("returns null for a dead id, which the API reports as a null cart", async () => {
    server.use(shop.query(CartByIdDocument, () => HttpResponse.json({ data: { cart: null } })));

    expect(await getCart("gid://shopify/Cart/gone")).toBeNull();
  });
});

describe("getCartFromCookie", () => {
  it("returns an empty cart when there is no cookie, without calling the API", async () => {
    cookieJar.clear();
    let called = false;
    server.use(
      shop.query(CartByIdDocument, () => {
        called = true;
        return HttpResponse.json({ data: cartByIdFixture });
      }),
    );

    const cart = await getCartFromCookie();

    expect(cart.lines).toEqual([]);
    expect(cart.totalQuantity).toBe(0);
    expect(called).toBe(false);
  });

  it("returns the cart behind the cookie", async () => {
    cookieJar.set("cart_id", CART_ID);

    expect((await getCartFromCookie()).totalQuantity).toBe(5);
  });

  it("degrades to an empty cart when the id is dead", async () => {
    cookieJar.set("cart_id", "gid://shopify/Cart/gone");
    server.use(shop.query(CartByIdDocument, () => HttpResponse.json({ data: { cart: null } })));

    expect((await getCartFromCookie()).totalQuantity).toBe(0);
  });

  // The cart is read in the root layout, so a failing request must not take down every page.
  it("degrades to an empty cart when the request fails", async () => {
    cookieJar.set("cart_id", CART_ID);
    server.use(shop.query(CartByIdDocument, () => HttpResponse.error()));

    const cart = await getCartFromCookie();

    expect(cart.lines).toEqual([]);
    expect(cart.totalQuantity).toBe(0);
  });
});

/**
 * Regression guard for a bug that shipped silently in development: `CartLine` is a fragment
 * on the `BaseCartLine` **interface**, and Apollo's normalized cache drops every field of a
 * fragment it cannot match. Without `possibleTypes` a cached cart read back as nothing but
 * `__typename`, so the drawer rendered lines with no title, price or quantity — and no error
 * anywhere. The mapper's own tests pass regardless, because they never touch Apollo.
 */
describe("Apollo cache configuration", () => {
  function roundTrip(cache: InMemoryCache) {
    cache.writeQuery({
      query: CartByIdDocument,
      variables: { id: CART_ID },
      data: cartByIdFixture,
    });
    return cache.readQuery({ query: CartByIdDocument, variables: { id: CART_ID } });
  }

  it("round-trips a cart through the cache with every field intact", () => {
    const read = roundTrip(new InMemoryCache({ possibleTypes: POSSIBLE_TYPES }));
    const line = read?.cart?.lines.nodes[0];

    expect(line).toBeDefined();
    expect(line).toMatchObject({
      id: "gid://shopify/CartLine/14265",
      quantity: 3,
      merchandise: { id: "gid://shopify/ProductVariant/9745" },
    });
  });

  it("loses the line entirely without possibleTypes, which is why the config exists", () => {
    const read = roundTrip(new InMemoryCache());

    // Proves the failure this configuration prevents: only `__typename` survives.
    expect(Object.keys(read?.cart?.lines.nodes[0] ?? {})).toEqual(["__typename"]);
  });

  it("covers every abstract type the cart documents select through", () => {
    expect(POSSIBLE_TYPES).toMatchObject({
      BaseCartLine: ["CartLine", "ComponentizableCartLine"],
      Merchandise: ["ProductVariant"],
    });
  });
});
