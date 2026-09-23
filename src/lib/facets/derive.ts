import { toAmount } from "@/lib/format/money";
import { formatOptionName, formatOptionValue } from "@/lib/format/options";
import type { ProductCard } from "@/types/catalog";

// The API ignores `filters:` and returns an empty `productFilters` (verified against
// mock.shop on 2026-09-23), so facets are derived here from the products the collection
// page already fetched (project overview §5.1) — no second query, no server-side filtering.
//
// Dimensions are whatever option axes the products carry, not a fixed color/size pair:
// this catalog uses color × size in two collections, material × size and finish × size in
// the other two, so a hard-coded pair would leave half the catalog unfilterable.

/** One selectable value within an option facet, with the number of products offering it. */
export interface FacetValue {
  /** The raw API value (`moss`, `XS`) — the identity used for filtering and in the URL. */
  value: string;
  /** The display label (`Moss`, `XS`); color is never the only signal (§8). */
  label: string;
  count: number;
}

/** One option axis present in the collection, e.g. `color` with slate/moss/clay. */
export interface OptionFacet {
  /** The raw API option name (`color`), used as the URL param key. */
  name: string;
  label: string;
  values: FacetValue[];
}

/** The price span the collection covers. Both bounds are inclusive. */
export interface PriceFacet {
  min: number;
  max: number;
  currencyCode: string;
}

export interface FacetGroups {
  options: OptionFacet[];
  /** `null` when the collection has no products, so there is no span to offer. */
  price: PriceFacet | null;
  /** How many products are discounted; `0` means the sale facet has nothing to filter. */
  saleCount: number;
}

/**
 * Derives the available facets from a collection's products.
 *
 * Option axes and their values keep the order the API returned them in — sizes arrive as
 * `XS, S, M, L`, which sorting would scramble into `L, M, S, XS`. Counts are per product,
 * so a product offering `moss` in four sizes still counts once towards `moss`.
 *
 * Pure and framework-free: phase 2 re-runs it over an already-filtered list to get counts
 * that reflect the other active facets, which is the behaviour §5.1 asks for.
 */
export function deriveFacets(products: ProductCard[]): FacetGroups {
  // A fresh object every call: a module-level constant would be one mutable array shared
  // by every caller, and in a long-lived server that leaks between requests.
  if (products.length === 0) return { options: [], price: null, saleCount: 0 };

  // Insertion-ordered: option name → option value → product count.
  const axes = new Map<string, Map<string, number>>();
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let currencyCode = "";
  let saleCount = 0;

  for (const product of products) {
    for (const option of product.options) {
      const values = axes.get(option.name) ?? new Map<string, number>();
      axes.set(option.name, values);
      // A product lists each of its values once, but guard the count against a
      // duplicate value so one product can never count twice for the same facet.
      for (const value of new Set(option.values)) {
        values.set(value, (values.get(value) ?? 0) + 1);
      }
    }

    const amount = toAmount(product.price);
    if (amount !== null) {
      min = Math.min(min, amount);
      max = Math.max(max, amount);
      currencyCode ||= product.price.currencyCode;
    }

    if (product.isOnSale) saleCount += 1;
  }

  const options: OptionFacet[] = [...axes].map(([name, values]) => ({
    name,
    label: formatOptionName(name),
    values: [...values].map(([value, count]) => ({
      value,
      label: formatOptionValue(value),
      count,
    })),
  }));

  // Every price failed to parse: there is no span to show, but the option facets still hold.
  const price = Number.isFinite(min) ? { min, max, currencyCode } : null;

  return { options, price, saleCount };
}
