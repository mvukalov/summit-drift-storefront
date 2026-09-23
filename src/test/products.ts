import type { ProductCard, ProductOption } from "@/types/catalog";

// A builder for facet tests, where the interesting fields are options, price and isOnSale.
// The real fixtures in ./msw/fixtures stay the source of truth for mapping; this exists so a
// test can state "two products, one moss, one clay" without 20 lines of image and price data.

interface ProductOverrides {
  handle: string;
  title?: string;
  options?: ProductOption[];
  price?: string;
  isOnSale?: boolean;
}

export function makeProduct({
  handle,
  title = handle,
  options = [{ name: "color", values: ["moss"] }],
  price = "100.0",
  isOnSale = false,
}: ProductOverrides): ProductCard {
  return {
    handle,
    title,
    options,
    image: null,
    price: { amount: price, currencyCode: "USD" },
    compareAtPrice: isOnSale ? { amount: "200.0", currencyCode: "USD" } : null,
    isOnSale,
  };
}
