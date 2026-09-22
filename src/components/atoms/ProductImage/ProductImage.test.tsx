import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductImage } from "./ProductImage";

const image = {
  url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
  altText: "Slate shell jacket on a stand",
  width: 768,
  height: 1344,
};
const SIZES = "(min-width: 768px) 25vw, 50vw";

describe("ProductImage", () => {
  it("renders the image with the given sizes and its alt text", () => {
    render(<ProductImage image={image} title="Shell Jacket" sizes={SIZES} />);

    const img = screen.getByRole("img", { name: "Slate shell jacket on a stand" });
    expect(img).toHaveAttribute("sizes", SIZES);
    expect(img).toHaveAttribute("src", expect.stringContaining("/_next/image?url="));
  });

  it.each([null, "", "   "])("falls back to the title when altText is %j", (altText) => {
    render(<ProductImage image={{ ...image, altText }} title="Shell Jacket" sizes={SIZES} />);

    expect(screen.getByRole("img", { name: "Shell Jacket" })).toBeInTheDocument();
  });

  it("renders empty alt text when decorative, even if the API has alt text", () => {
    const { container } = render(
      <ProductImage image={image} title="Shell Jacket" sizes={SIZES} decorative />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("marks the LCP image as high priority and eager", () => {
    render(<ProductImage image={image} title="Shell Jacket" sizes={SIZES} isLcp />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("loads other images eagerly without high priority", () => {
    render(<ProductImage image={image} title="Shell Jacket" sizes={SIZES} />);

    const img = screen.getByRole("img");
    expect(img).not.toHaveAttribute("fetchpriority");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("renders only the placeholder frame when there is no image", () => {
    const { container } = render(<ProductImage image={null} title="Shell Jacket" sizes={SIZES} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });
});
