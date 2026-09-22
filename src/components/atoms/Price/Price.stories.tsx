import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Price } from "./Price";

const meta = {
  title: "Atoms/Price",
  component: Price,
  tags: ["autodocs"],
  args: { price: { amount: "249.0", currencyCode: "USD" } },
} satisfies Meta<typeof Price>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnSale: Story = {
  args: { compareAtPrice: { amount: "323.7", currencyCode: "USD" }, isOnSale: true },
};

export const OtherCurrency: Story = {
  args: { price: { amount: "1500.0", currencyCode: "JPY" } },
};
