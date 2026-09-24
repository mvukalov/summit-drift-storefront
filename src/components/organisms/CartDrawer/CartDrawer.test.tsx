import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { QUANTITY_SEND_DELAY_MS } from "@/components/organisms/CartProvider/CartProvider";
import type { CartActionResult } from "@/lib/cart/actions";
import {
  removeCartLine,
  renderWithCart,
  resetCartActions,
  stubDialog,
  testCart,
  testLine,
  unstubDialog,
  updateCartLine,
} from "@/test/cart";
import type { Cart } from "@/types/cart";
import { CartDrawer } from "./CartDrawer";
import { CartTrigger } from "../Header/CartTrigger";

// The cart talks to the server through Server Actions, so the action module is the seam a
// component test mocks. There is no browser GraphQL request for MSW to intercept.
vi.mock("@/lib/cart/actions", () => import("@/test/cart-actions"));

beforeAll(stubDialog);
afterAll(unstubDialog);

const LINE = testLine({
  id: "line-1",
  quantity: 2,
  unitPrice: { amount: "50.00", currencyCode: "USD" },
});
const CART = testCart([LINE]);

beforeEach(() => {
  resetCartActions(CART);
});

/** Renders the drawer with its header trigger, and opens it. */
async function openDrawer(cart: Cart = CART) {
  const user = userEvent.setup();
  renderWithCart(
    <>
      <CartTrigger />
      <CartDrawer />
    </>,
    cart,
  );
  await user.click(screen.getByRole("button", { name: /^Cart,/ }));
  return { user, dialog: screen.getByRole("dialog", { name: "Your cart" }) };
}

describe("CartDrawer", () => {
  it("lists each line with its options, quantity and total", async () => {
    const { dialog } = await openDrawer();

    const item = within(dialog).getByRole("listitem");
    // `selector: "p"` because the product title also appears in the Remove button's
    // screen-reader-only suffix and in the stepper's hidden label.
    expect(within(item).getByText("Ripstop Shell Jacket", { selector: "p" })).toBeInTheDocument();
    expect(within(item).getByText("Slate / M")).toBeInTheDocument();
    expect(within(item).getByRole("spinbutton")).toHaveValue(2);
    // 2 x $50.00, recomputed rather than taken from the server.
    expect(within(item).getByText("$100.00")).toBeInTheDocument();
  });

  it("shows the subtotal and a checkout link", async () => {
    const { dialog } = await openDrawer();

    const subtotalRow = within(dialog).getByText("Subtotal").closest("p");
    expect(subtotalRow).toHaveTextContent("$100.00");
    expect(within(dialog).getByRole("link", { name: "Checkout" })).toHaveAttribute(
      "href",
      CART.checkoutUrl,
    );
  });

  it("offers an empty state instead of a subtotal when there is nothing in the cart", async () => {
    const { dialog } = await openDrawer(testCart());

    expect(within(dialog).getByText("Your cart is empty.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "Checkout" })).not.toBeInTheDocument();
  });

  it("bounds the stepper between 1 and 10", async () => {
    const atMax = testCart([testLine({ id: "line-1", quantity: 10 })]);
    const { dialog } = await openDrawer(atMax);

    expect(within(dialog).getByRole("button", { name: "Increase quantity" })).toBeDisabled();

    const atMin = within(dialog).getByRole("spinbutton");
    expect(atMin).toHaveValue(10);
  });

  it("disables decrementing at the minimum", async () => {
    const { dialog } = await openDrawer(testCart([testLine({ id: "line-1", quantity: 1 })]));

    expect(within(dialog).getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });

  describe("optimistic updates", () => {
    it("shows the new quantity before the mutation resolves, and keeps it after", async () => {
      // Held open so the assertion lands while the request is still in flight.
      let release!: (result: CartActionResult) => void;
      updateCartLine.mockReturnValue(
        new Promise<CartActionResult>((resolve) => {
          release = resolve;
        }),
      );

      const { user, dialog } = await openDrawer();
      await user.click(within(dialog).getByRole("button", { name: "Increase quantity" }));

      // Before the server has said anything.
      expect(within(dialog).getByRole("spinbutton")).toHaveValue(3);

      const updated = testCart([
        { ...LINE, quantity: 3, lineTotal: { amount: "150.00", currencyCode: "USD" } },
      ]);
      release({ ok: true, cart: updated });

      await waitFor(() => expect(within(dialog).getByRole("spinbutton")).toHaveValue(3));
    });

    it("rolls back to the old quantity and explains why when the action reports userErrors", async () => {
      updateCartLine.mockResolvedValue({
        ok: false,
        error: "That option is no longer available.",
      });

      const { user, dialog } = await openDrawer();
      await user.click(within(dialog).getByRole("button", { name: "Increase quantity" }));

      expect(within(dialog).getByRole("spinbutton")).toHaveValue(3);

      // The base state never advanced, so React reverts the optimistic value on its own.
      await waitFor(() => expect(within(dialog).getByRole("spinbutton")).toHaveValue(2));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "That option is no longer available.",
      );
    });

    it("rolls back the same way when the request itself fails", async () => {
      updateCartLine.mockResolvedValue({
        ok: false,
        error: "Something went wrong. Please try again.",
      });

      const { user, dialog } = await openDrawer();
      await user.click(within(dialog).getByRole("button", { name: "Increase quantity" }));

      await waitFor(() => expect(within(dialog).getByRole("spinbutton")).toHaveValue(2));
      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("removes a line optimistically", async () => {
      removeCartLine.mockResolvedValue({ ok: true, cart: testCart() });

      const { user, dialog } = await openDrawer();
      await user.click(within(dialog).getByRole("button", { name: /^Remove/ }));

      expect(await within(dialog).findByText("Your cart is empty.")).toBeInTheDocument();
      expect(removeCartLine).toHaveBeenCalledWith("line-1");
    });

    it("puts a removed line back when the removal fails", async () => {
      removeCartLine.mockResolvedValue({
        ok: false,
        error: "Something went wrong. Please try again.",
      });

      const { user, dialog } = await openDrawer();
      await user.click(within(dialog).getByRole("button", { name: /^Remove/ }));

      expect(
        await within(dialog).findByText("Ripstop Shell Jacket", { selector: "p" }),
      ).toBeInTheDocument();
      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });
  });

  describe("quantity debounce", () => {
    beforeEach(() => {
      // Only the timer functions the debounce uses. Faking `queueMicrotask` too (the default)
      // stalls React's transition scheduler.
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // `fireEvent` rather than `userEvent`: Testing Library only knows how to drive a fake
    // clock when jest-style globals are present, and this project imports `vi` explicitly, so
    // `userEvent`'s internal waits never resolve under fake timers. `fireEvent` is synchronous
    // and needs no clock, which leaves the timing assertions below exact rather than flaky.
    it("shows every click immediately but sends one mutation with the final value", async () => {
      updateCartLine.mockResolvedValue({
        ok: true,
        cart: testCart([
          { ...LINE, quantity: 7, lineTotal: { amount: "350.00", currencyCode: "USD" } },
        ]),
      });
      renderWithCart(
        <>
          <CartTrigger />
          <CartDrawer />
        </>,
        CART,
      );
      fireEvent.click(screen.getByRole("button", { name: /^Cart,/ }));

      const dialog = screen.getByRole("dialog", { name: "Your cart" });
      const plus = within(dialog).getByRole("button", { name: "Increase quantity" });

      for (let i = 0; i < 5; i += 1) {
        fireEvent.click(plus);
        // Each press is on screen before anything is sent.
        await act(async () => {});
        expect(within(dialog).getByRole("spinbutton")).toHaveValue(2 + i + 1);
      }

      expect(updateCartLine).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(QUANTITY_SEND_DELAY_MS);
      });

      // Five presses, one request, carrying only the settled value.
      expect(updateCartLine).toHaveBeenCalledTimes(1);
      expect(updateCartLine).toHaveBeenCalledWith("line-1", 7);
    });

    it("keeps the settled quantity on screen rather than flashing back to the old one", async () => {
      // The server echoes the quantity it was sent, as the real API does.
      updateCartLine.mockResolvedValue({
        ok: true,
        cart: testCart([
          { ...LINE, quantity: 3, lineTotal: { amount: "150.00", currencyCode: "USD" } },
        ]),
      });
      renderWithCart(
        <>
          <CartTrigger />
          <CartDrawer />
        </>,
        CART,
      );
      fireEvent.click(screen.getByRole("button", { name: /^Cart,/ }));
      const dialog = screen.getByRole("dialog", { name: "Your cart" });

      fireEvent.click(within(dialog).getByRole("button", { name: "Increase quantity" }));
      await act(async () => {});

      // The optimistic value must survive the whole debounce window, not just the click.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(QUANTITY_SEND_DELAY_MS - 50);
      });
      expect(within(dialog).getByRole("spinbutton")).toHaveValue(3);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(within(dialog).getByRole("spinbutton")).toHaveValue(3);
    });
  });
});
