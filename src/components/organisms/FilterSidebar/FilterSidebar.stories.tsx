import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { buildFacetsView } from "@/lib/facets/counts";
import { deriveFacets } from "@/lib/facets/derive";
import type { SelectedFacets } from "@/lib/facets/url";
import type { ProductCard } from "@/types/catalog";
import { FilterSidebar } from "./FilterSidebar";

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

// A spread of prices, colors and sizes, so every facet has something to show.
const PRODUCTS = [
  product("a", "25.0", "slate", "XS", true),
  product("b", "75.0", "moss", "S"),
  product("c", "120.0", "moss", "M"),
  product("d", "189.0", "clay", "M", true),
  product("e", "249.0", "slate", "L"),
  product("f", "485.0", "clay", "L"),
];

function view(selected: SelectedFacets) {
  return buildFacetsView(PRODUCTS, deriveFacets(PRODUCTS), selected);
}

const NOTHING: SelectedFacets = { options: {}, price: null, onSale: false };

const meta = {
  title: "Organisms/FilterSidebar",
  component: FilterSidebar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The desktop filter column, shown from 1280px up. Below that the same `FilterPanel` is presented by `FilterDrawer` in a modal `<dialog>`, so this story renders nothing at narrow viewports — resize to see it. Every change is a navigation, so the counts and the grid always come from the server.",
      },
    },
  },
  args: { view: view(NOTHING), selected: NOTHING, basePath: BASE_PATH, sort: "featured" },
} satisfies Meta<typeof FilterSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Counts on the other axes narrow to the moss products; the color axis keeps counting the
// whole collection, so switching color is still possible.
export const WithSelection: Story = {
  args: (() => {
    const selected: SelectedFacets = { options: { color: ["moss"] }, price: null, onSale: false };
    return { view: view(selected), selected };
  })(),
};

export const SeveralFiltersActive: Story = {
  args: (() => {
    const selected: SelectedFacets = {
      options: { color: ["moss", "clay"], size: ["M"] },
      price: { min: 50, max: 149.99 },
      onSale: false,
    };
    return { view: view(selected), selected };
  })(),
};

// A collection whose prices all sit in one bucket offers no price group at all, and one
// with nothing discounted offers no availability group.
export const FewerFacets: Story = {
  args: (() => {
    const flat = [product("a", "20.0", "sand", "S"), product("b", "30.0", "fern", "M")];
    return {
      view: buildFacetsView(flat, deriveFacets(flat), NOTHING),
      selected: NOTHING,
    };
  })(),
};
