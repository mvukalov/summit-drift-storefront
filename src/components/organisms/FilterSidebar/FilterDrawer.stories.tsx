import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { buildFacetsView } from "@/lib/facets/counts";
import { deriveFacets } from "@/lib/facets/derive";
import type { SelectedFacets } from "@/lib/facets/url";
import type { ProductCard } from "@/types/catalog";
import { FilterDrawer } from "./FilterDrawer";

const BASE_PATH = "/collections/summit-protection-shells";

function product(
  handle: string,
  price: string,
  color: string,
  size: string,
  isOnSale = false,
): ProductCard {
  return {
    handle,
    title: handle,
    options: [
      { name: "color", values: [color] },
      { name: "size", values: [size] },
    ],
    image: null,
    price: { amount: price, currencyCode: "USD" },
    compareAtPrice: isOnSale ? { amount: "400.0", currencyCode: "USD" } : null,
    isOnSale,
  };
}

const PRODUCTS = [
  product("a", "25.0", "slate", "XS", true),
  product("b", "75.0", "moss", "S"),
  product("c", "120.0", "moss", "M"),
  product("d", "189.0", "clay", "M", true),
  product("e", "249.0", "slate", "L"),
  product("f", "485.0", "clay", "L"),
];

const NOTHING: SelectedFacets = { options: {}, price: null, onSale: false };

function view(selected: SelectedFacets) {
  return buildFacetsView(PRODUCTS, deriveFacets(PRODUCTS), selected);
}

const meta = {
  title: "Organisms/FilterDrawer",
  component: FilterDrawer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The filter trigger shown below 1280px and the native modal `<dialog>` it opens — the same pattern as the header's mobile nav, so `showModal()` supplies the focus trap and Escape. The drawer stays open while filters are applied, and its footer confirms how many products are left.",
      },
    },
  },
  args: {
    view: view(NOTHING),
    selected: NOTHING,
    basePath: BASE_PATH,
    sort: "featured",
    resultCount: PRODUCTS.length,
  },
} satisfies Meta<typeof FilterDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const WithActiveFilters: Story = {
  args: (() => {
    const selected: SelectedFacets = {
      options: { color: ["moss"], size: ["M"] },
      price: null,
      onSale: true,
    };
    return { view: view(selected), selected, resultCount: 1 };
  })(),
};

export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Filters/ }));
    await expect(await canvas.findByRole("dialog", { name: "Filters" })).toBeInTheDocument();
  },
};

export const OpenWithFilters: Story = {
  args: WithActiveFilters.args,
  play: Open.play,
};
