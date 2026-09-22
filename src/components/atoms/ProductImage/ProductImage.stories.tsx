import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductImage } from "./ProductImage";
import styles from "./ProductImage.stories.module.scss";

const meta = {
  title: "Atoms/ProductImage",
  component: ProductImage,
  tags: ["autodocs"],
  args: {
    image: {
      url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
      altText: "Slate hooded shell jacket on a stand",
      width: 768,
      height: 1344,
    },
    title: "Waterproof Wading Jacket",
    sizes: "300px",
  },
  decorators: [
    (Story) => (
      <div className={styles.container}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Lcp: Story = {
  args: { isLcp: true },
};

/** The catalog has no alt text; the title is used instead. */
export const MissingAltText: Story = {
  args: { image: { ...meta.args.image, altText: null } },
};

/** No image: the placeholder frame keeps the layout stable. */
export const NoImage: Story = {
  args: { image: null },
};

/** Empty alt text: the image's name is already shown next to it (collection tiles). */
export const Decorative: Story = {
  args: { decorative: true },
};
