import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ProductOption, ProductVariant } from "@/types/catalog";
import { VariantPicker } from "./VariantPicker";

const OPTIONS: ProductOption[] = [
  { name: "color", values: ["slate", "moss", "clay"] },
  { name: "size", values: ["XS", "S", "M", "L"] },
];

function variant(color: string, size: string, availableForSale = true): ProductVariant {
  return {
    id: `gid://${color}-${size}`,
    title: `${color} / ${size}`,
    sku: null,
    availableForSale,
    selectedOptions: [
      { name: "color", value: color },
      { name: "size", value: size },
    ],
    price: { amount: "249.0", currencyCode: "USD" },
    compareAtPrice: null,
    image: null,
  };
}

const ALL = OPTIONS[0]!.values.flatMap((color) =>
  OPTIONS[1]!.values.map((size) => variant(color, size)),
);

const meta = {
  title: "Organisms/VariantPicker",
  component: VariantPicker,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "One radio group per option axis. Selecting a value pushes a new URL rather than " +
          "setting local state, so the variant is shareable and server-rendered (§5.2). " +
          "Axis names and values are normalized for display — the API sends `color` and `moss`.",
      },
    },
  },
} satisfies Meta<typeof VariantPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    handle: "waterproof-wading-jacket",
    options: OPTIONS,
    variants: ALL,
    selection: { color: "slate", size: "M" },
  },
};

/**
 * Sold-out combinations stay selectable so the shopper can see why they are unavailable.
 * They are struck through and announced, never signalled by colour alone. This catalog has
 * no unavailable variant, so the state only appears here and in tests.
 */
export const WithSoldOutCombinations: Story = {
  args: {
    handle: "waterproof-wading-jacket",
    options: OPTIONS,
    variants: ALL.map((item) =>
      item.title.startsWith("moss") ? { ...item, availableForSale: false } : item,
    ),
    selection: { color: "slate", size: "M" },
  },
};

/** A single-axis product, e.g. accessories sized only by finish. */
export const SingleAxis: Story = {
  args: {
    handle: "trekking-poles",
    options: [{ name: "finish", values: ["matte", "weather-resistant", "breathable"] }],
    variants: [
      { ...variant("matte", ""), selectedOptions: [{ name: "finish", value: "matte" }] },
      {
        ...variant("weather-resistant", ""),
        selectedOptions: [{ name: "finish", value: "weather-resistant" }],
      },
      {
        ...variant("breathable", ""),
        selectedOptions: [{ name: "finish", value: "breathable" }],
      },
    ],
    selection: { finish: "matte" },
  },
};
