import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { MenuItem } from "@/types/navigation";
import { Header } from "./Header";

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
          "Site header: logo, primary navigation from the `main-menu` API menu, a placeholder cart button and, below 1280px, a menu button that opens a native modal `<dialog>`. Resize the viewport to switch between layouts.",
      },
    },
  },
  args: { items: ITEMS },
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
