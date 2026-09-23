import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductOption, ProductVariant } from "@/types/catalog";
import { VariantPicker } from "./VariantPicker";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const OPTIONS: ProductOption[] = [
  { name: "color", values: ["slate", "moss"] },
  { name: "size", values: ["XS", "M"] },
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

const VARIANTS = [
  variant("slate", "XS"),
  variant("slate", "M"),
  variant("moss", "XS"),
  variant("moss", "M"),
];

function renderPicker(overrides: Partial<Parameters<typeof VariantPicker>[0]> = {}) {
  return render(
    <VariantPicker
      handle="jacket"
      options={OPTIONS}
      variants={VARIANTS}
      selection={{ color: "slate", size: "XS" }}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  push.mockClear();
});

describe("VariantPicker", () => {
  it("renders one labelled group per option axis", () => {
    renderPicker();

    expect(screen.getByRole("group", { name: /Color/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Size/ })).toBeInTheDocument();
  });

  it("normalizes the API's lowercase axis names and values for display", () => {
    renderPicker();

    // The API sends `color` / `moss`; the UI must not show them raw.
    expect(screen.getByRole("radio", { name: /^Moss/ })).toBeInTheDocument();
    // An abbreviation stays verbatim rather than becoming "Xs".
    expect(screen.getByRole("radio", { name: /^XS/ })).toBeInTheDocument();
  });

  it("marks the selected value on each axis as checked", () => {
    renderPicker();

    expect(screen.getByRole("radio", { name: /^Slate/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^XS/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^Moss/ })).not.toBeChecked();
  });

  it("pushes the URL for the new selection, keeping the other axes", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("radio", { name: /^Moss/ }));

    expect(push).toHaveBeenCalledWith("/products/jacket?color=moss&size=XS", { scroll: false });
  });

  // Scrolling to the top on every size click would be hostile on a long page.
  it("does not scroll on selection", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("radio", { name: /^M$/ }));

    expect(push).toHaveBeenCalledWith(expect.any(String), { scroll: false });
  });

  describe("unavailable combinations", () => {
    // The catalog has none (0 of 360), so this is the only place the path is exercised.
    const partlySoldOut = [
      variant("slate", "XS", true),
      variant("slate", "M", true),
      variant("moss", "XS", false),
      variant("moss", "M", true),
    ];

    it("announces a sold-out combination in the option's accessible name", () => {
      renderPicker({ variants: partlySoldOut, selection: { color: "slate", size: "XS" } });

      expect(screen.getByRole("radio", { name: /Moss.*out of stock/i })).toBeInTheDocument();
    });

    it("leaves it selectable, so the shopper can see why it is unavailable", () => {
      renderPicker({ variants: partlySoldOut, selection: { color: "slate", size: "XS" } });

      expect(screen.getByRole("radio", { name: /^Moss/ })).toBeEnabled();
    });

    it("re-evaluates availability as the other axis changes", () => {
      // moss is sold out in XS, available in M.
      renderPicker({ variants: partlySoldOut, selection: { color: "slate", size: "M" } });

      expect(screen.queryByRole("radio", { name: /Moss.*out of stock/i })).not.toBeInTheDocument();
    });
  });

  it("is navigable by keyboard", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.tab();
    expect(screen.getByRole("radio", { name: /^Slate/ })).toHaveFocus();
  });
});
