import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CartDrawer } from "@/components/organisms/CartDrawer/CartDrawer";
import { CartTrigger } from "@/components/organisms/Header/CartTrigger";
import { MAX_QUANTITY } from "@/lib/cart/limits";
import {
  addToCart,
  renderWithCart,
  resetCartActions,
  stubDialog,
  testCart,
  testLine,
  unstubDialog,
} from "@/test/cart";
import type { Cart, CartLine } from "@/types/cart";
import type { ProductVariant } from "@/types/catalog";
import { AddToCart } from "./AddToCart";

vi.mock("@/lib/cart/actions", () => import("@/test/cart-actions"));

beforeAll(stubDialog);
afterAll(unstubDialog);

const VARIANT: ProductVariant = {
  id: "gid://shopify/ProductVariant/9732",
  title: "slate / XS",
  sku: null,
  availableForSale: true,
  selectedOptions: [
    { name: "color", value: "slate" },
    { name: "size", value: "XS" },
  ],
  price: { amount: "249.00", currencyCode: "USD" },
  compareAtPrice: null,
  image: null,
};

const TITLE = "Waterproof Wading Jacket";

function lineFor(quantity: number): CartLine {
  return testLine({
    id: "line-1",
    variantId: VARIANT.id,
    title: TITLE,
    quantity,
    unitPrice: VARIANT.price,
  });
}

beforeEach(() => {
  resetCartActions(testCart([lineFor(1)]));
});

function renderAddToCart(cart: Cart = testCart(), available = true) {
  const user = userEvent.setup();
  renderWithCart(
    <>
      <CartTrigger />
      <AddToCart available={available} variant={VARIANT} title={TITLE} />
      <CartDrawer />
    </>,
    cart,
  );
  // An unavailable variant labels the same button "Out of stock".
  const button = available
    ? screen.getByRole("button", { name: "Add to cart" })
    : screen.getByRole("button", { name: "Out of stock" });
  return { user, button };
}

describe("AddToCart", () => {
  it("adds the selected variant with the chosen quantity", async () => {
    const { user, button } = renderAddToCart();

    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(button);

    await waitFor(() => expect(addToCart).toHaveBeenCalledWith(VARIANT.id, 2));
  });

  // Moving focus into the dialog is `showModal()`'s own behaviour, which jsdom does not
  // implement and the stub does not fake — faking it would test the stub. Verified in
  // Chromium (focus lands on "Close cart") and asserted for real in the E2E suite; what this
  // test owns is that a successful add is what opens the drawer.
  it("opens the drawer on success", async () => {
    const { user, button } = renderAddToCart();

    await user.click(button);

    expect(await screen.findByRole("dialog", { name: "Your cart" })).toBeVisible();
  });

  it("shows the line optimistically, before the action resolves", async () => {
    let release!: (value: { ok: true; cart: Cart }) => void;
    addToCart.mockReturnValue(
      new Promise((resolve) => {
        release = resolve as typeof release;
      }),
    );

    const { user, button } = renderAddToCart();
    await user.click(button);

    // The header count reflects the add while the request is still in flight.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cart, 1 item" })).toBeInTheDocument(),
    );

    release({ ok: true, cart: testCart([lineFor(1)]) });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cart, 1 item" })).toBeInTheDocument(),
    );
  });

  it("rolls the count back and shows a message when the action fails", async () => {
    addToCart.mockResolvedValue({ ok: false, error: "That option is no longer available." });

    const { user, button } = renderAddToCart();
    await user.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That option is no longer available.",
    );
    // The base never advanced, so the count returns to empty and the drawer stays shut.
    expect(screen.getByRole("button", { name: "Cart, 0 items" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Your cart" })).not.toBeInTheDocument();
  });

  it("ties the error to the button that caused it", async () => {
    addToCart.mockResolvedValue({ ok: false, error: "That option is no longer available." });

    const { user, button } = renderAddToCart();
    await user.click(button);

    const alert = await screen.findByRole("alert");
    expect(button).toHaveAttribute("aria-describedby", alert.id);
  });

  /**
   * Decision 4: an add that would cross the ceiling is refused before anything is dispatched.
   * The point of these two is that the refusal costs no request and rolls nothing back.
   */
  describe("at the per-line maximum", () => {
    it("refuses without calling the action", async () => {
      const full = testCart([lineFor(MAX_QUANTITY)]);
      const { user, button } = renderAddToCart(full);

      await user.click(button);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        `You can have at most ${MAX_QUANTITY} of this item in the cart.`,
      );
      expect(addToCart).not.toHaveBeenCalled();
    });

    it("leaves the quantity on screen untouched", async () => {
      const full = testCart([lineFor(MAX_QUANTITY)]);
      const { user, button } = renderAddToCart(full);

      await user.click(button);
      await screen.findByRole("alert");

      expect(
        screen.getByRole("button", { name: `Cart, ${MAX_QUANTITY} items` }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Your cart" })).not.toBeInTheDocument();
    });

    it("refuses an overshoot rather than clamping to the maximum", async () => {
      // 8 in the cart plus 5 requested is 13, which does not quietly become 10.
      const { user, button } = renderAddToCart(testCart([lineFor(8)]));
      const plus = screen.getByRole("button", { name: "Increase quantity" });
      for (let i = 0; i < 4; i += 1) await user.click(plus);

      await user.click(button);

      expect(await screen.findByRole("alert")).toHaveTextContent("at most");
      expect(addToCart).not.toHaveBeenCalled();
    });
  });

  describe("an unavailable variant", () => {
    it("states it in text and disables the button", () => {
      renderAddToCart(testCart(), false);

      expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
      // Stated in text, never by the disabled styling alone. (`getByText` rather than
      // `getByRole("status")`: the header's live region is a status too.)
      const notice = screen.getByText(/This option is out of stock/);
      expect(notice).toHaveAttribute("role", "status");
    });
  });

  it("shows the added line in the drawer it opens", async () => {
    const { user, button } = renderAddToCart();

    await user.click(button);

    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    expect(within(dialog).getByText(TITLE, { selector: "p" })).toBeInTheDocument();
  });
});
