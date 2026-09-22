import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Swatch } from "./Swatch";

// Sample colors for the stories only. The real option-value → color mapping is catalog data
// and lives outside the design system.
const meta = {
  title: "Atoms/Swatch",
  component: Swatch,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A selectable color option: a native radio styled as a pill with a color dot and label. Hover styles are checked manually in a browser with a real pointer (Playwright); there is no Hover story, because a play function's synthetic hover doesn't trigger CSS `:hover`.",
      },
    },
  },
  args: { name: "color", value: "moss", color: "#4f5d3a", label: "Moss", onChange: fn() },
  argTypes: {
    color: { control: "color" },
  },
} satisfies Meta<typeof Swatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { selected: true },
};

export const FocusVisible: Story = {
  play: async ({ userEvent }) => {
    await userEvent.tab();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Group: Story = {
  render: (args) => (
    <fieldset>
      <legend>Color</legend>
      <Swatch {...args} value="slate" color="#333a45" label="Slate" selected />
      <Swatch {...args} value="moss" color="#4f5d3a" label="Moss" />
      <Swatch {...args} value="clay" color="#b5623f" label="Clay" />
    </fieldset>
  ),
};
