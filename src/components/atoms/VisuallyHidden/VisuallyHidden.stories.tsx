import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VisuallyHidden } from "./VisuallyHidden";

const meta = {
  title: "Atoms/VisuallyHidden",
  component: VisuallyHidden,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Renders nothing visible. The story wraps it in a button: the button has no visible text, but its accessible name comes from the hidden label.",
      },
    },
  },
  args: { children: "Close cart" },
  render: (args) => (
    <button type="button">
      ×<VisuallyHidden {...args} />
    </button>
  ),
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
