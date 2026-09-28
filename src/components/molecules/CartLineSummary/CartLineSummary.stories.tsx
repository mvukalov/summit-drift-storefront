import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { CartLine } from "@/types/cart";
import { CartLineSummary } from "./CartLineSummary";

const LINE: CartLine = {
  id: "gid://shopify/CartLine/1",
  variantId: "gid://shopify/ProductVariant/1",
  title: "Waterproof Wading Jacket With Breathable Shell",
  options: [
    { name: "color", value: "moss" },
    { name: "size", value: "M" },
  ],
  image: null,
  quantity: 2,
  unitPrice: { amount: "249.00", currencyCode: "USD" },
  lineTotal: { amount: "498.00", currencyCode: "USD" },
};

const meta = {
  title: "Molecules/CartLineSummary",
  component: CartLineSummary,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "One cart line without controls. The cart drawer puts its stepper and Remove button under it; the checkout summary shows it read-only with the quantity spelled out. It has no interactive state of its own.",
      },
    },
  },
  args: { line: LINE },
} satisfies Meta<typeof CartLineSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithQuantity: Story = {
  args: { showQuantity: true },
};

export const NoOptions: Story = {
  args: { line: { ...LINE, title: "Trail Map Case", options: [] }, showQuantity: true },
};
