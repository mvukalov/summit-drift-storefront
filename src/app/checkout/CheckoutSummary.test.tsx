import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartTrigger } from "@/components/organisms/Header/CartTrigger";
import {
  money,
  removeAllCartLines,
  renderWithCart,
  resetCartActions,
  testCart,
  testLine,
} from "@/test/cart";
import type { Cart } from "@/types/cart";
import { CheckoutSummary } from "./CheckoutSummary";

vi.mock("@/lib/cart/actions", () => import("@/test/cart-actions"));

const CART = testCart([
  testLine({ id: "line-1", quantity: 2, unitPrice: money("50.00") }),
  testLine({
    id: "line-2",
    variantId: "gid://shopify/ProductVariant/2",
    title: "Canvas Trail Pants",
    options: [{ name: "size", value: "32" }],
    quantity: 1,
    unitPrice: money("75.00"),
  }),
]);

beforeEach(() => {
  resetCartActions(testCart());
});

/** Renders the summary next to the header's cart button, so the count can be asserted. */
function renderCheckout(cart: Cart = CART) {
  const user = userEvent.setup();
  renderWithCart(
    <>
      <CartTrigger />
      <CheckoutSummary />
    </>,
    cart,
  );
  return { user };
}

describe("CheckoutSummary", () => {
  it("lists every line with its quantity, unit price and line total, then the total", () => {
    renderCheckout();

    const summary = screen.getByRole("region", { name: "Order summary" });
    const items = within(summary).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Ripstop Shell Jacket");
    expect(items[0]).toHaveTextContent("Quantity 2, $50.00 each");
    expect(items[0]).toHaveTextContent("$100.00");
    expect(items[1]).toHaveTextContent("Quantity 1, $75.00 each");

    expect(within(summary).getByText("Total").closest("p")).toHaveTextContent("$175.00");
  });

  it("offers a way back instead of a summary when the cart is empty", () => {
    renderCheckout(testCart());

    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue shopping" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "Place order" })).not.toBeInTheDocument();
  });

  it("confirms the order, moves focus to the confirmation and empties the cart", async () => {
    const { user } = renderCheckout();
    expect(screen.getByRole("button", { name: /^Cart, 3 items/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Place order" }));

    const heading = screen.getByRole("heading", { name: "Order placed" });
    expect(heading).toHaveFocus();
    expect(screen.getByRole("link", { name: "Continue shopping" })).toHaveAttribute("href", "/");
    expect(removeAllCartLines).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Cart, 0 items/ })).toBeInTheDocument(),
    );
    // The emptied cart doesn't swap the confirmation for the empty state.
    expect(screen.queryByText("Your cart is empty.")).not.toBeInTheDocument();
  });

  it("rolls back to the summary with a message when the cart can't be emptied", async () => {
    removeAllCartLines.mockResolvedValue({
      ok: false,
      error: "Something went wrong. Please try again.",
    });
    const { user } = renderCheckout();

    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(screen.queryByRole("heading", { name: "Order placed" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Place order" })).toHaveFocus();
    expect(screen.getByRole("button", { name: /^Cart, 3 items/ })).toBeInTheDocument();
  });

  it("clears the previous message when the order is retried", async () => {
    removeAllCartLines.mockResolvedValueOnce({
      ok: false,
      error: "Something went wrong. Please try again.",
    });
    const { user } = renderCheckout();

    await user.click(screen.getByRole("button", { name: "Place order" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(screen.getByRole("heading", { name: "Order placed" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
