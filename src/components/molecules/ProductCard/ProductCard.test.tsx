import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProductCard as ProductCardData } from "@/types/catalog";
import { ProductCard } from "./ProductCard";

const SIZES = "(min-width: 768px) 25vw, 50vw";

const product: ProductCardData = {
  handle: "waterproof-wading-jacket-with-breathable-shell",
  title: "Waterproof Wading Jacket With Breathable Shell",
  image: {
    url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
    altText: "Technical waterproof wading jacket",
    width: 768,
    height: 1344,
  },
  price: { amount: "249.0", currencyCode: "USD" },
  compareAtPrice: null,
  isOnSale: false,
};

const saleProduct: ProductCardData = {
  ...product,
  compareAtPrice: { amount: "323.7", currencyCode: "USD" },
  isOnSale: true,
};

describe("ProductCard", () => {
  it("links the title to the product page", () => {
    render(<ProductCard product={product} sizes={SIZES} />);

    expect(screen.getByRole("link", { name: product.title })).toHaveAttribute(
      "href",
      "/products/waterproof-wading-jacket-with-breathable-shell",
    );
  });

  it("renders the title as a heading, the image and the price", () => {
    render(<ProductCard product={product} sizes={SIZES} />);

    expect(screen.getByRole("heading", { level: 3, name: product.title })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Technical waterproof wading jacket" })).toHaveAttribute(
      "sizes",
      SIZES,
    );
    expect(screen.getByText("$249.00")).toBeInTheDocument();
  });

  it("does not show a sale badge when the product is not on sale", () => {
    render(<ProductCard product={product} sizes={SIZES} />);

    expect(screen.queryByText("Sale")).not.toBeInTheDocument();
    expect(screen.queryByRole("deletion")).not.toBeInTheDocument();
  });

  it("shows a sale badge and the original price when on sale", () => {
    render(<ProductCard product={saleProduct} sizes={SIZES} />);

    expect(screen.getByText("Sale")).toBeInTheDocument();
    expect(screen.getByRole("deletion")).toHaveTextContent("Original price: $323.70");
  });

  it("uses the title as alt text when the image has none", () => {
    render(
      <ProductCard
        product={{ ...product, image: product.image && { ...product.image, altText: null } }}
        sizes={SIZES}
      />,
    );

    expect(screen.getByRole("img", { name: product.title })).toBeInTheDocument();
  });
});
