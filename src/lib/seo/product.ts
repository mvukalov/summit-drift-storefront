import type { ProductDetail, ProductVariant } from "@/types/catalog";
import { absoluteUrl } from "./site";

// schema.org Product for the PDP (§5.5), built from the same data the page renders so the
// two can't disagree. `JsonLd` escapes the output, so nothing here needs to.

const SCHEMA = "https://schema.org";
const IN_STOCK = `${SCHEMA}/InStock`;
const OUT_OF_STOCK = `${SCHEMA}/OutOfStock`;

function availability(variant: ProductVariant): string {
  return variant.availableForSale ? IN_STOCK : OUT_OF_STOCK;
}

function toOffer(variant: ProductVariant, url: string): Record<string, unknown> {
  return {
    "@type": "Offer",
    url,
    sku: variant.sku ?? undefined,
    price: variant.price.amount,
    priceCurrency: variant.price.currencyCode,
    availability: availability(variant),
  };
}

function lowest(variants: readonly ProductVariant[]): string | undefined {
  const amounts = variants.map((variant) => Number(variant.price.amount));
  return amounts.length > 0 ? String(Math.min(...amounts)) : undefined;
}

function highest(variants: readonly ProductVariant[]): string | undefined {
  const amounts = variants.map((variant) => Number(variant.price.amount));
  return amounts.length > 0 ? String(Math.max(...amounts)) : undefined;
}

/**
 * The `Product` block for a PDP.
 *
 * A product with more than one variant gets an `AggregateOffer` spanning their prices, with
 * each variant as an individual offer underneath; a single-variant product gets a plain
 * `Offer`, which is what consumers expect rather than an aggregate of one.
 *
 * `description` is the API's plain-text field, never `descriptionHtml` (schema.org wants
 * text) and never `seo.description`, which returns HTML for 17 of the 30 products and is
 * truncated mid-sentence for 23 of them (verified 2026-09-23).
 */
export function buildProductJsonLd(product: ProductDetail, path: string): Record<string, unknown> {
  const url = absoluteUrl(path);
  const { variants } = product;

  const offers =
    variants.length === 1 && variants[0]
      ? toOffer(variants[0], url)
      : {
          "@type": "AggregateOffer",
          offerCount: variants.length,
          lowPrice: lowest(variants),
          highPrice: highest(variants),
          priceCurrency: variants[0]?.price.currencyCode,
          availability: variants.some((variant) => variant.availableForSale)
            ? IN_STOCK
            : OUT_OF_STOCK,
          offers: variants.map((variant) => toOffer(variant, url)),
        };

  return {
    "@context": SCHEMA,
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((image) => image.url),
    sku: variants[0]?.sku ?? undefined,
    brand: { "@type": "Brand", name: product.vendor },
    url,
    offers,
  };
}
