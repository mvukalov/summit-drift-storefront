import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Select } from "./Select";

const meta = {
  title: "Atoms/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A labelled native `<select>`, styled to match `Input`. Native on purpose: keyboard support and the mobile picker come for free. Hover styles are checked manually in a browser with a real pointer; there is no Hover story, because a play function's synthetic hover doesn't trigger CSS `:hover`.",
      },
    },
  },
  args: {
    label: "Sort",
    options: [
      { value: "featured", label: "Featured" },
      { value: "price-asc", label: "Price: Low to High" },
      { value: "price-desc", label: "Price: High to Low" },
      { value: "best-selling", label: "Best Selling" },
    ],
    onChange: fn(),
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Label beside the control, as used in the collection toolbar. */
export const Inline: Story = {
  args: { inline: true, label: "Sort:" },
};

export const FocusVisible: Story = {
  play: async ({ userEvent }) => {
    await userEvent.tab();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
