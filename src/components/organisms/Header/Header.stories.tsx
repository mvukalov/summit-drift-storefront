import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MockedProvider } from "@apollo/client/testing/react";
import { expect } from "storybook/test";
import type { Cart } from "@/types/cart";
import type { MenuItem } from "@/types/navigation";
import { CartProvider } from "../CartProvider/CartProvider";
import { Header } from "./Header";

// The header's cart button reads the cart from `CartProvider`, which the root layout supplies
// in the app. An empty cart is enough here: the badge's states belong to the CartDrawer stories.
const EMPTY_CART: Cart = {
  id: "gid://shopify/Cart/c1-story?key=abc",
  lines: [],
  subtotal: { amount: "0.00", currencyCode: "USD" },
  totalQuantity: 0,
  checkoutUrl: "https://apparel-outdoor.hydrogen.mock.shop/checkout",
};

// The four collection links as the `main-menu` API returns them (Home filtered out).
const ITEMS: MenuItem[] = [
  { title: "Summit Protection Shells", href: "/collections/summit-protection-shells" },
  { title: "Trail Foundation Layers", href: "/collections/trail-foundation-layers" },
  { title: "Rugged Traverse Bottoms", href: "/collections/rugged-traverse-bottoms" },
  { title: "Expedition Field Gear", href: "/collections/expedition-field-gear" },
];

const meta = {
  title: "Organisms/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Site header: logo, primary navigation from the `main-menu` API menu, the cart button and, below 1280px, a menu button that opens a native modal `<dialog>`. Resize the viewport to switch between layouts.",
      },
    },
  },
  args: { items: ITEMS },
  // Nested as the root layout nests them: Apollo outside, the cart inside. The search combobox
  // needs a client-side Apollo client; no responses are mocked because these stories are about
  // the header's layout, and the combobox only queries once typed into — its own states live
  // in Molecules/SearchCombobox.
  decorators: [
    (Story) => (
      <MockedProvider>
        <CartProvider initialCart={EMPTY_CART}>
          <Story />
        </CartProvider>
      </MockedProvider>
    ),
  ],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: { viewport: { value: "desktop" } },
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile2" } },
};

export const MobileMenuOpen: Story = {
  globals: { viewport: { value: "mobile2" } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Menu" }));
    await expect(canvas.getByRole("dialog", { name: "Menu" })).toBeVisible();
  },
};

export const SkipLinkFocused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Skip to content" })).toHaveFocus();
  },
};

export const WithoutMenu: Story = {
  args: { items: [] },
};
