import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { expect } from "storybook/test";
import { PredictiveSearchDocument } from "@/lib/graphql/generated/graphql";
import {
  emptyPredictiveSearchFixture,
  predictiveSearchFixture,
} from "@/test/msw/fixtures/predictiveSearch";
import { SearchCombobox } from "./SearchCombobox";

/**
 * Serves every `PredictiveSearch` call with the same response, whatever the query text: the
 * story decides the state, the keystrokes just trigger it.
 */
function withPredictiveSearch(
  data: typeof predictiveSearchFixture | typeof emptyPredictiveSearchFixture,
  delay = 0,
): Decorator {
  const mocks: MockLink.MockedResponse[] = [
    {
      request: { query: PredictiveSearchDocument, variables: () => true },
      result: { data },
      delay,
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
  ];
  return function PredictiveSearchMock(Story) {
    return (
      <MockedProvider mocks={mocks}>
        <Story />
      </MockedProvider>
    );
  };
}

const meta = {
  title: "Molecules/SearchCombobox",
  component: SearchCombobox,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Header predictive search: a WAI-ARIA list-autocomplete combobox. Queries fire 300 ms after the last keystroke, from 2 characters. Arrow keys move the active option (`aria-activedescendant`), Enter opens it, Enter with nothing active or **See all results** goes to `/search?q=`, Escape closes without clearing. Stories serve a fixed response through Apollo's `MockedProvider`.",
      },
    },
  },
  decorators: [withPredictiveSearch(predictiveSearchFixture)],
} satisfies Meta<typeof SearchCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Populated: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Search products" }), "jacket");
    await expect(await canvas.findByRole("listbox", { name: "Search results" })).toBeVisible();
  },
};

export const ActiveOption: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "Search products" });
    await userEvent.type(input, "jacket");
    await canvas.findByRole("listbox", { name: "Search results" });
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    const [, second] = canvas.getAllByRole("option");
    await expect(input).toHaveAttribute("aria-activedescendant", second?.id);
  },
};

export const Loading: Story = {
  // Long enough that the story stays in its loading state while you look at it.
  decorators: [withPredictiveSearch(predictiveSearchFixture, 10 * 60 * 1000)],
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Search products" }), "jacket");
    await expect(await canvas.findByText("Searching…")).toBeVisible();
  },
};

export const NoResults: Story = {
  decorators: [withPredictiveSearch(emptyPredictiveSearchFixture)],
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Search products" }), "jaket");
    await expect(await canvas.findByText(/check the spelling/)).toBeVisible();
  },
};
