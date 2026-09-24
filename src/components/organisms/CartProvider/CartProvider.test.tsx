import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addToCart,
  removeCartLine,
  resetCartActions,
  testCart,
  testLine,
  updateCartLine,
} from "@/test/cart";
import type { Cart } from "@/types/cart";
import { CartProvider, QUANTITY_SEND_DELAY_MS, useCart } from "./CartProvider";

vi.mock("@/lib/cart/actions", () => import("@/test/cart-actions"));

const LINE = testLine({ id: "line-1", quantity: 1 });
const CART = testCart([LINE]);

beforeEach(() => {
  resetCartActions(CART);
});

/** Surfaces the parts of the context these tests assert on. */
function Probe() {
  const { cart, addLine, setLineQuantity, removeLine, isPending, error } = useCart();
  const firstLine = cart.lines[0];

  return (
    <div>
      <output>{cart.totalQuantity}</output>
      <span data-testid="subtotal">{cart.subtotal.amount}</span>
      <span data-testid="pending">{String(isPending)}</span>
      <span data-testid="error">{error ?? ""}</span>
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
      <button
        type="button"
        onClick={() => firstLine && setLineQuantity(firstLine.id, firstLine.quantity + 1)}
      >
        increment
      </button>
      <button type="button" onClick={() => firstLine && removeLine(firstLine.id)}>
        remove
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

  /**
   * Regression: `removeLine` used to clear a queued quantity send's timer without resolving
   * the `settled` promise the earlier `setLineQuantity` transition is awaiting. That left the
   * transition pending forever — `isPending` never cleared, and any change after it stalled
   * behind a promise nothing would ever resolve.
   */
  describe("removing a line with a queued quantity change", () => {
    beforeEach(() => {
      // Only the timer functions the debounce uses; faking `queueMicrotask` too stalls
      // React's transition scheduler.
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // `waitFor` is not used here: it polls with a real `setTimeout`, which never fires while
    // fake timers are active and nothing advances them further, so it would hang exactly like
    // the bug this test guards against. `act` alone flushes the chained microtasks this
    // scenario produces (cancel -> the awaited `settled` promise resolves -> the transition's
    // async function resumes and finishes), the same way it does in `CartDrawer.test.tsx`'s
    // debounce tests.
    it("releases isPending instead of hanging, and lets a later change go through", async () => {
      renderProbe();

      // Queue a quantity change, but remove the line before its 300ms debounce fires.
      fireEvent.click(screen.getByRole("button", { name: "increment" }));
      await act(async () => {});
      fireEvent.click(screen.getByRole("button", { name: "remove" }));
      await act(async () => {});

      expect(screen.getByTestId("pending")).toHaveTextContent("false");
      // Cancelled, not fired: the queued update never reaches the network.
      expect(updateCartLine).not.toHaveBeenCalled();

      // The provider isn't wedged behind the promise that used to hang: an unrelated change
      // still completes.
      const served = testCart([testLine({ id: "line-2", quantity: 1 })]);
      addToCart.mockResolvedValue({ ok: true, cart: served });
      fireEvent.click(screen.getByRole("button", { name: "add" }));
      await act(async () => {});

      expect(screen.getByTestId("pending")).toHaveTextContent("false");
      expect(addToCart).toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent("1");
    });
  });

  /**
   * `addToCart`/`updateCartLine`/`removeCartLine` are called from inside a `startTransition`
   * callback with no surrounding try/catch. If the Server Action's own RPC rejects — a
   * network failure reaching it at all, not a GraphQL error the action already caught and
   * mapped to `{ ok: false }` — an uncaught throw here used to leave the transition's promise
   * unsettled, so `isPending` never cleared.
   */
  describe("when a Server Action call itself rejects", () => {
    it("addLine: clears isPending and rolls back instead of hanging", async () => {
      addToCart.mockRejectedValue(new Error("network down"));

      const { user } = renderProbe();
      await user.click(screen.getByRole("button", { name: "add" }));

      await waitFor(() => expect(screen.getByTestId("pending")).toHaveTextContent("false"));
      // No code undoes this: the base never advanced, so useOptimistic reverts on its own.
      expect(screen.getByRole("status")).toHaveTextContent("1");
    });

    // Synchronous assertions rather than `waitFor`, for the same reason as the test above:
    // `waitFor`'s polling never fires while fake timers are active.
    it("setLineQuantity: clears isPending, shows a message and reverts the quantity", async () => {
      updateCartLine.mockRejectedValue(new Error("network down"));
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      renderProbe();
      fireEvent.click(screen.getByRole("button", { name: "increment" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(QUANTITY_SEND_DELAY_MS);
      });

      expect(screen.getByTestId("pending")).toHaveTextContent("false");
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Something went wrong. Please try again.",
      );
      expect(screen.getByRole("status")).toHaveTextContent("1");

      vi.useRealTimers();
    });

    it("removeLine: clears isPending, shows a message and restores the line", async () => {
      removeCartLine.mockRejectedValue(new Error("network down"));

      const { user } = renderProbe();
      await user.click(screen.getByRole("button", { name: "remove" }));

      await waitFor(() => expect(screen.getByTestId("pending")).toHaveTextContent("false"));
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Something went wrong. Please try again.",
      );
      expect(screen.getByRole("status")).toHaveTextContent("1");
    });
  });
});
