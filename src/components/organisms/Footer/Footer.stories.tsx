import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { MenuItem } from "@/types/navigation";
import { Footer } from "./Footer";

const ITEMS: MenuItem[] = [
  { title: "Summit Protection Shells", href: "/collections/summit-protection-shells" },
  { title: "Trail Foundation Layers", href: "/collections/trail-foundation-layers" },
  { title: "Rugged Traverse Bottoms", href: "/collections/rugged-traverse-bottoms" },
  { title: "Expedition Field Gear", href: "/collections/expedition-field-gear" },
];

const meta = {
  title: "Organisms/Footer",
  component: Footer,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { items: ITEMS },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FocusVisible: Story = {
  play: async ({ userEvent }) => {
    await userEvent.tab();
  },
};

export const WithoutMenu: Story = {
  args: { items: [] },
};
