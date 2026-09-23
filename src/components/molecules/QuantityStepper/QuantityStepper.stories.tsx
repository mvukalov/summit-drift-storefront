import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { QuantityStepper } from "./QuantityStepper";

const meta = {
  title: "Molecules/QuantityStepper",
  component: QuantityStepper,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Controlled quantity input. The API accepts any quantity and reports no inventory, " +
          "so the 1–10 ceiling is a frontend rule (project overview §5.3).",
      },
    },
  },
  // Controlled: the stories own the state so the buttons actually move.
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <QuantityStepper {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof QuantityStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 1, onChange: () => {}, min: 1, max: 10 },
};

/** At the minimum, decrement is disabled rather than silently doing nothing. */
export const AtMinimum: Story = {
  args: { value: 1, onChange: () => {}, min: 1, max: 10 },
};

export const AtMaximum: Story = {
  args: { value: 10, onChange: () => {}, min: 1, max: 10 },
};

/** Used on the PDP when the selected variant is out of stock. */
export const Disabled: Story = {
  args: { value: 1, onChange: () => {}, min: 1, max: 10, disabled: true },
};
