import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { FilterChip } from "./FilterChip";

const meta = {
  title: "Molecules/FilterChip",
  component: FilterChip,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "One active filter above the product grid. The whole chip is the button, so there is one tab stop per filter and the target stays over 44px. Hover styles are checked in a real browser; a play function's synthetic hover doesn't trigger CSS `:hover`.",
      },
    },
  },
  args: { label: "Moss", onRemove: fn() },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Abbreviations carry their axis, because "M" says nothing on its own.
export const WithAxis: Story = {
  args: { label: "Size M" },
};

export const Boolean: Story = {
  args: { label: "On sale" },
};

export const PriceRange: Story = {
  args: { label: "$50 – $150" },
};

export const LongLabel: Story = {
  args: { label: "Weather Resistant" },
};

export const FocusVisible: Story = {
  play: async ({ userEvent }) => {
    await userEvent.tab();
  },
};
