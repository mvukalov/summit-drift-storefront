import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { MAX_QUANTITY } from "@/lib/cart/limits";
import type { Cart, CartLine } from "@/types/cart";
import type { Money } from "@/types/catalog";
import { CartDrawer } from "./CartDrawer";
import { CartProvider } from "../CartProvider/CartProvider";
import { CartTrigger } from "../Header/CartTrigger";

function money(amount: string): Money {
  return { amount, currencyCode: "USD" };
}

function line(
  id: string,
  title: string,
  quantity: number,
  unitPrice: string,
  options: [string, string][],
): CartLine {
  return {
    id,
    variantId: `gid://shopify/ProductVariant/${id}`,
    title,
    options: options.map(([name, value]) => ({ name, value })),
    image: null,
    quantity,
    unitPrice: money(unitPrice),
    lineTotal: money((Number(unitPrice) * quantity).toFixed(2)),
  };
}

function cart(lines: CartLine[]): Cart {
  const subtotal = lines.reduce((sum, l) => sum + Number(l.unitPrice.amount) * l.quantity, 0);
  return {
    id: "gid://shopify/Cart/c1-story?key=abc",
    lines,
    subtotal: money(subtotal.toFixed(2)),
    totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    checkoutUrl: "https://apparel-outdoor.hydrogen.mock.shop/checkout",
  };
}

const POPULATED = cart([
  line("1", "Waterproof Wading Jacket With Breathable Shell", 1, "249.00", [
    ["color", "slate"],
    ["size", "XS"],
  ]),
  line("2", "Oversized Technical Nylon Jacket", 3, "485.00", [
    ["color", "moss"],
    ["size", "S"],
  ]),
]);

const AT_MAXIMUM = cart([
  line("1", "Waterproof Wading Jacket With Breathable Shell", MAX_QUANTITY, "249.00", [
    ["color", "slate"],
    ["size", "XS"],
  ]),
]);

const meta = {
  title: "Organisms/CartDrawer",
  component: CartDrawer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The cart as a native modal `<dialog>`, opened from the header button — the same pattern as the mobile nav and the filter drawer, so `showModal()` supplies the focus trap and Escape. Cart changes are inert here: the Server Actions behind them cannot run in a browser-only Storybook, so these stories cover rendering, states and accessibility rather than behaviour.",
      },
    },
  },
  // The drawer reads everything from context, so each story is really a cart fixture.
  args: { cart: POPULATED },
  argTypes: { cart: { control: false } },
  render: ({ cart: value }: { cart: Cart }) => (
    <CartProvider initialCart={value}>
      <CartTrigger />
      <CartDrawer />
    </CartProvider>
  ),
} satisfies Meta<{ cart: Cart }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed, as it sits in the header: the trigger with its item count. */
export const Closed: Story = {};

export const Populated: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Cart,/ }));
    await expect(await canvas.findByRole("dialog", { name: "Your cart" })).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { cart: cart([]) },
  play: Populated.play,
};

/** A line at the per-line ceiling: the increment control is disabled rather than hidden. */
export const AtMaximum: Story = {
  args: { cart: AT_MAXIMUM },
  play: Populated.play,
};

/**
 * The error state a failed change produces. Storybook's actions always report failure, so
 * pressing a stepper here is the way to see it.
 */
export const WithError: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Cart,/ }));
    const dialog = await canvas.findByRole("dialog", { name: "Your cart" });
    await expect(dialog).toBeInTheDocument();
    await userEvent.click(canvas.getAllByRole("button", { name: "Increase quantity" })[0]!);
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};
