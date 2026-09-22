import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Input } from "./Input";

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

const meta = {
  title: "Atoms/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A labelled text input with an optional decorative leading icon. Hover styles are checked manually in a browser with a real pointer (Playwright); there is no Hover story, because a play function's synthetic hover doesn't trigger CSS `:hover`.",
      },
    },
  },
  args: {
    label: "Email address",
    type: "email",
    placeholder: "name@example.com",
    onChange: fn(),
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIcon: Story = {
  args: { label: "Search", type: "search", placeholder: "Search gear", icon: <SearchIcon /> },
};

export const FocusVisible: Story = {
  play: async ({ userEvent }) => {
    await userEvent.tab();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
