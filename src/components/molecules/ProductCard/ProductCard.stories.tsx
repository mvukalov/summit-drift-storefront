import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCard } from "./ProductCard";
import styles from "./ProductCard.stories.module.scss";

const meta = {
  title: "Molecules/ProductCard",
  component: ProductCard,
  tags: ["autodocs"],
  args: {
    product: {
      handle: "performance-technical-tee",
      title: "Performance Technical Tee",
      image: {
        url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/397c28136fe9eeff79e6bad8d5329065.png?v=13678502",
        altText: "Performance technical tee laid flat",
        width: 768,
        height: 1344,
      },
      price: { amount: "45.0", currencyCode: "USD" },
      compareAtPrice: null,
      isOnSale: false,
    },
    sizes: "300px",
  },
  decorators: [
    (Story) => (
      <div className={styles.container}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnSale: Story = {
  args: {
    product: {
      ...meta.args.product,
      compareAtPrice: { amount: "58.5", currencyCode: "USD" },
      isOnSale: true,
    },
  },
};

/** Collection images have no alt text; the title is used instead. */
export const MissingAltText: Story = {
  args: {
    product: {
      ...meta.args.product,
      image: { ...meta.args.product.image, altText: null },
    },
  },
};
