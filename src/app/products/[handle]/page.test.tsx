import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductPage, { generateMetadata } from "./page";
import { getProduct } from "@/lib/catalog/fetchers";
import { toProductDetail } from "@/lib/catalog/mappers";
import { productByHandleFixture } from "@/test/msw/fixtures/productByHandle";
import type { ProductDetail } from "@/types/catalog";

const HANDLE = productByHandleFixture.product.handle;
const PATH = `/products/${HANDLE}`;

vi.mock("@/lib/catalog/fetchers", () => ({
  getProduct: vi.fn(),
}));

// notFound() throws in Next; the mock keeps that contract so the page can't fall through.
const notFoundError = new Error("NEXT_NOT_FOUND");
const push = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw notFoundError;
  },
  useRouter: () => ({ push }),
}));

const mockedGetProduct = vi.mocked(getProduct);

function fixture(): ProductDetail {
  return toProductDetail(productByHandleFixture.product);
}

function props(searchParams: Record<string, string | string[]> = {}, handle = HANDLE) {
  return {
    params: Promise.resolve({ handle }),
    searchParams: Promise.resolve(searchParams),
  } as Parameters<typeof ProductPage>[0];
}

async function renderPage(searchParams: Record<string, string | string[]> = {}) {
  render(await ProductPage(props(searchParams)));
}

beforeEach(() => {
  push.mockClear();
  mockedGetProduct.mockReset();
  mockedGetProduct.mockResolvedValue(fixture());
});

describe("ProductPage", () => {
  it("renders the product title as the page heading", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Waterproof Wading Jacket With Breathable Shell",
      }),
    ).toBeInTheDocument();
  });

  it("renders the description as markup rather than escaped tags", async () => {
    await renderPage();

    // Scoped to the description: the gallery's thumbnail strip is a list too.
    const details = within(screen.getByRole("region", { name: "Details" }));

    expect(details.getByRole("list")).toBeInTheDocument();
    expect(details.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.queryByText(/<p>|<ul>/)).not.toBeInTheDocument();
  });

  it("404s on an unknown handle", async () => {
    mockedGetProduct.mockResolvedValue(null);

    await expect(ProductPage(props({}, "does-not-exist"))).rejects.toThrow(notFoundError);
  });

  describe("variant selection", () => {
    it("defaults to the first variant when no params are given", async () => {
      await renderPage();

      expect(screen.getByRole("radio", { name: /^Slate/ })).toBeChecked();
      expect(screen.getByRole("radio", { name: /^XS/ })).toBeChecked();
    });

    it("pre-selects the variant named in the URL", async () => {
      await renderPage({ color: "moss", size: "M" });

      expect(screen.getByRole("radio", { name: /^Moss/ })).toBeChecked();
      expect(screen.getByRole("radio", { name: /^M$/ })).toBeChecked();
    });

    // A half-specified link is what a shared URL looks like when one axis was picked.
    it("fills the unchosen axes of a partial selection", async () => {
      await renderPage({ color: "moss" });

      expect(screen.getByRole("radio", { name: /^Moss/ })).toBeChecked();
      expect(screen.getByRole("radio", { name: /^XS/ })).toBeChecked();
    });

    it("falls back to the default variant for a nonsense selection", async () => {
      await renderPage({ color: "purple" });

      expect(screen.getByRole("radio", { name: /^Slate/ })).toBeChecked();
    });
  });

  describe("add to cart", () => {
    it("offers an enabled button for an available variant", async () => {
      await renderPage();

      expect(screen.getByRole("button", { name: "Add to cart" })).toBeEnabled();
    });

    it("states out of stock in text and disables the button", async () => {
      const soldOut = fixture();
      mockedGetProduct.mockResolvedValue({
        ...soldOut,
        variants: soldOut.variants.map((variant) => ({ ...variant, availableForSale: false })),
      });

      await renderPage();

      expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
      expect(screen.getByText(/out of stock/i, { selector: "p" })).toBeInTheDocument();
    });
  });

  // The API always returns variants and images today. If it ever stopped, the page has to
  // degrade rather than crash: no picker, nothing to buy, but a readable product.
  describe("a product with no variants and no images", () => {
    function bare() {
      return { ...fixture(), variants: [], images: [] };
    }

    it("still renders the title", async () => {
      mockedGetProduct.mockResolvedValue(bare());
      await renderPage();

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("disables add to cart, because there is nothing purchasable", async () => {
      mockedGetProduct.mockResolvedValue(bare());
      await renderPage();

      expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
    });

    it("omits the OG image rather than emitting an empty one", async () => {
      mockedGetProduct.mockResolvedValue(bare());
      const metadata = await generateMetadata(props());

      expect(metadata.openGraph?.images).toBeUndefined();
    });
  });

  describe("structured data", () => {
    it("renders Product and BreadcrumbList blocks", async () => {
      const { container } = render(await ProductPage(props()));
      const blocks = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
        (script) => JSON.parse(script.textContent ?? "{}"),
      );

      expect(blocks.map((block) => block["@type"])).toContain("Product");
      expect(blocks.map((block) => block["@type"])).toContain("BreadcrumbList");
    });
  });
});

describe("generateMetadata", () => {
  beforeEach(() => {
    mockedGetProduct.mockResolvedValue(fixture());
  });

  it("uses the product title and plain-text description", async () => {
    const metadata = await generateMetadata(props());

    expect(metadata.title).toBe("Waterproof Wading Jacket With Breathable Shell");
    expect(String(metadata.description)).not.toContain("<p>");
  });

  // Variant params identify a variant, not another product (§5.5).
  it("canonicalizes to the clean product URL", async () => {
    const metadata = await generateMetadata(props({ color: "moss", size: "M" }));

    expect(metadata.alternates?.canonical).toBe(PATH);
  });

  it("returns a not-found title for an unknown handle", async () => {
    mockedGetProduct.mockResolvedValue(null);

    await expect(generateMetadata(props({}, "nope"))).resolves.toStrictEqual({
      title: "Product not found",
    });
  });
});
