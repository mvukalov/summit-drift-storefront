import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Image } from "@/types/catalog";
import { ProductGallery } from "./ProductGallery";

function image(n: number, altText: string | null = null): Image {
  return { url: `https://cdn.example.com/${n}.png`, altText, width: 768, height: 1344 };
}

const IMAGES = [image(1, "Front view"), image(2, "Back view"), image(3)];

describe("ProductGallery", () => {
  it("shows the first image by default", () => {
    render(<ProductGallery images={IMAGES} title="Wading Jacket" />);

    expect(screen.getByRole("img", { name: "Front view" })).toBeInTheDocument();
  });

  it("falls back to the product title when the API has no alt text", () => {
    render(<ProductGallery images={[image(3)]} title="Wading Jacket" />);

    expect(screen.getByRole("img", { name: "Wading Jacket" })).toBeInTheDocument();
  });

  it("reserves the image's aspect ratio so the page does not shift", () => {
    render(<ProductGallery images={IMAGES} title="Wading Jacket" />);
    const main = screen.getByRole("img", { name: "Front view" });

    // Intrinsic width/height is what next/image uses to reserve the space.
    expect(main).toHaveAttribute("width", "768");
    expect(main).toHaveAttribute("height", "1344");
  });

  // Collection images report null dimensions; a product image could too. The fallback keeps
  // the aspect ratio reserved so a missing size can never cause layout shift.
  it("falls back to the catalog's native dimensions when the API omits them", () => {
    const sizeless: Image = {
      url: "https://cdn.example.com/x.png",
      altText: "X",
      width: null,
      height: null,
    };
    render(<ProductGallery images={[sizeless]} title="Wading Jacket" />);
    const main = screen.getByRole("img", { name: "X" });

    expect(main).toHaveAttribute("width", "768");
    expect(main).toHaveAttribute("height", "1344");
  });

  it("switches the main image when a thumbnail is chosen", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={IMAGES} title="Wading Jacket" />);

    await user.click(screen.getByRole("button", { name: /Back view/ }));

    expect(screen.getByRole("img", { name: "Back view" })).toBeInTheDocument();
  });

  it("marks the active thumbnail for assistive technology", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={IMAGES} title="Wading Jacket" />);

    await user.click(screen.getByRole("button", { name: /Back view/ }));

    expect(screen.getByRole("button", { name: /Back view/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("renders no thumbnail strip for a single image", () => {
    render(<ProductGallery images={[image(1, "Only")]} title="Wading Jacket" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a placeholder rather than crashing when there are no images", () => {
    const { container } = render(<ProductGallery images={[]} title="Wading Jacket" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });

  // Every variant in this catalog reports the product's featured image, so the per-variant
  // path is only reachable in tests.
  describe("following the selected variant", () => {
    it("shows the variant's own image", () => {
      render(
        <ProductGallery
          images={IMAGES}
          title="Wading Jacket"
          activeImageUrl="https://cdn.example.com/2.png"
        />,
      );

      expect(screen.getByRole("img", { name: "Back view" })).toBeInTheDocument();
    });

    it("ignores a variant image that is not part of the gallery", () => {
      render(
        <ProductGallery
          images={IMAGES}
          title="Wading Jacket"
          activeImageUrl="https://cdn.example.com/elsewhere.png"
        />,
      );

      expect(screen.getByRole("img", { name: "Front view" })).toBeInTheDocument();
    });
  });
});
