import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addToCart, resetCartActions, testCart, testLine } from "@/test/cart";
import type { Cart } from "@/types/cart";
import { CartProvider, useCart } from "./CartProvider";

vi.mock("@/lib/cart/actions", () => import("@/test/cart-actions"));

const LINE = testLine({ id: "line-1", quantity: 1 });
const CART = testCart([LINE]);

beforeEach(() => {
  resetCartActions(CART);
});

/** Surfaces the parts of the context these tests assert on. */
function Probe() {
  const { cart, addLine } = useCart();

  return (
    <div>
      <output>{cart.totalQuantity}</output>
      <span data-testid="subtotal">{cart.subtotal.amount}</span>
      <button
        type="button"
        onClick={() =>
          void addLine({
            variantId: "gid://shopify/ProductVariant/new",
            title: "Another Jacket",
            options: [],
            image: null,
            quantity: 1,
            unitPrice: { amount: "10.00", currencyCode: "USD" },
          })
        }
      >
        add
      </button>
    </div>
  );
}

function renderProbe(cart: Cart = CART) {
  const user = userEvent.setup();
  render(
    <CartProvider initialCart={cart}>
      <Probe />
    </CartProvider>,
  );
  return { user };
}

describe("CartProvider", () => {
  it("exposes the server cart it was given", () => {
    renderProbe();

    expect(screen.getByRole("status")).toHaveTextContent("1");
  });

  it("throws a useful error when useCart is used outside it", () => {
    // React logs the error boundary message; silenced so the run stays readable.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow("useCart must be used inside a CartProvider");

    consoleError.mockRestore();
  });

  it("advances the base state to the cart the action returned", async () => {
    const served = testCart([testLine({ id: "line-1", quantity: 4 })]);
    addToCart.mockResolvedValue({ ok: true, cart: served });

    const { user } = renderProbe();
    await user.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("4"));
  });

  it("does not advance the base state when the action fails", async () => {
    addToCart.mockResolvedValue({ ok: false, error: "Something went wrong. Please try again." });

    const { user } = renderProbe();
    await user.click(screen.getByRole("button", { name: "add" }));

    // Back to what the server last confirmed, with no code to undo anything.
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1"));
  });

  it("returns the refusal to the caller instead of dispatching, at the maximum", async () => {
    const full = testCart([
      testLine({ id: "line-1", variantId: "gid://shopify/ProductVariant/new", quantity: 10 }),
    ]);

    const { user } = renderProbe(full);
    await user.click(screen.getByRole("button", { name: "add" }));

    expect(addToCart).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("10");
  });

  /**
   * The cookie write on the first add re-renders the route, which hands the provider a new
   * `initialCart`. After mount the action's return value is authoritative, so that prop must
   * not be able to overwrite state the user has already moved on from.
   */
  it("ignores a later initialCart prop", async () => {
    const { rerender } = render(
      <CartProvider initialCart={CART}>
        <Probe />
      </CartProvider>,
    );

    rerender(
      <CartProvider initialCart={testCart([testLine({ id: "line-1", quantity: 99 })])}>
        <Probe />
      </CartProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1");
  });

  it("recomputes the subtotal optimistically rather than showing a stale one", async () => {
    // Held open so the assertion lands while the add is still in flight.
    let release!: (value: { ok: true; cart: Cart }) => void;
    addToCart.mockReturnValue(
      new Promise((resolve) => {
        release = resolve as typeof release;
      }),
    );

    const { user } = renderProbe(
      testCart([
        testLine({
          id: "line-1",
          quantity: 1,
          unitPrice: { amount: "100.00", currencyCode: "USD" },
        }),
      ]),
    );
    await user.click(screen.getByRole("button", { name: "add" }));

    // 100.00 already in the cart plus the 10.00 line being added.
    await waitFor(() => expect(screen.getByTestId("subtotal")).toHaveTextContent("110.00"));

    release({ ok: true, cart: CART });
  });
});
