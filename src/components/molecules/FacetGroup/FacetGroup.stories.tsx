import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { FacetGroup } from "./FacetGroup";

// Colors as `deriveFacets` + the catalog color map hand them over at runtime.
const COLORS = [
  { value: "slate", label: "Slate", count: 8, selected: false, color: "#333a45" },
  { value: "moss", label: "Moss", count: 6, selected: false, color: "#4f5d3a" },
  { value: "clay", label: "Clay", count: 4, selected: false, color: "#b5623f" },
];

const SIZES = [
  { value: "XS", label: "XS", count: 3, selected: false },
  { value: "S", label: "S", count: 6, selected: false },
  { value: "M", label: "M", count: 8, selected: false },
  { value: "L", label: "L", count: 5, selected: false },
];

const meta = {
  title: "Molecules/FacetGroup",
  component: FacetGroup,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "One labelled group of facet values, as a `<fieldset>` of native inputs so the axis is announced with every option. Counts say how many products the value would leave, given the other active filters.",
      },
    },
  },
  args: { legend: "Color", name: "color", options: COLORS, onChange: fn() },
} satisfies Meta<typeof FacetGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelection: Story = {
  args: {
    options: COLORS.map((option) => ({ ...option, selected: option.value === "moss" })),
  },
};

export const Textual: Story = {
  name: "Textual axis (no dots)",
  args: {
    legend: "Material",
    name: "material",
    options: [
      { value: "nylon-blend", label: "Nylon Blend", count: 4, selected: true },
      { value: "stretch-canvas", label: "Stretch Canvas", count: 2, selected: false },
      { value: "soft-shell", label: "Soft Shell", count: 2, selected: false },
    ],
  },
};

export const Pills: Story = {
  name: "Short values as pills",
  args: {
    legend: "Size",
    name: "size",
    display: "pill",
    options: SIZES.map((option) => ({ ...option, selected: option.value === "M" })),
  },
};

export const Radios: Story = {
  name: "Single choice (price)",
  args: {
    legend: "Price range",
    name: "price",
    type: "radio",
    options: [
      // Radios cannot be unchecked, so clearing the range needs an option of its own.
      { value: "", label: "Any price", selected: false },
      { value: "under-50", label: "Under $50", count: 3, selected: false },
      { value: "50-150", label: "$50 – $150", count: 4, selected: true },
      { value: "150-plus", label: "$150+", count: 5, selected: false },
    ],
  },
};

export const SingleCheckbox: Story = {
  name: "On sale",
  args: {
    legend: "Availability",
    name: "sale",
    options: [{ value: "sale", label: "On sale only", count: 3, selected: false }],
  },
};

export const FocusVisible: Story = {
  play: async ({ userEvent }) => {
    await userEvent.tab();
  },
};

// The axis exists but every value was filtered out by the other facets.
export const NoValues: Story = {
  args: { options: [] },
};
