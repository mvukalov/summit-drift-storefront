import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./Badge";

const meta = {
  title: "Atoms/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "inline-radio", options: ["accent", "neutral"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Accent: Story = {
  args: { tone: "accent", children: "Sale" },
};

export const Neutral: Story = {
  args: { tone: "neutral", children: "New" },
};
