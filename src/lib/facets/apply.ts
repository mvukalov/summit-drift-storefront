import { toAmount } from "@/lib/format/money";
import type { ProductCard } from "@/types/catalog";
import type { SelectedFacets } from "./url";

// Standard faceted-search semantics (project overview §5.1): values within one axis are
// OR-ed (moss *or* slate), axes are AND-ed (a moss *and* size-M product). Filtering happens
// here rather than on the API, which ignores `filters:` entirely.

function matchesOptions(product: ProductCard, selected: SelectedFacets["options"]): boolean {
  for (const [name, values] of Object.entries(selected)) {
    if (values.length === 0) continue;

    const option = product.options.find((candidate) => candidate.name === name);
    // A product without the axis at all cannot satisfy a filter on it.
    if (!option) return false;
    if (!option.values.some((value) => values.includes(value))) return false;
  }
  return true;
}

function matchesPrice(product: ProductCard, price: SelectedFacets["price"]): boolean {
  if (!price) return true;

  const amount = toAmount(product.price);
  // An unpriced product cannot be shown to be inside the range, so a price filter excludes it.
  if (amount === null) return false;
  // Both bounds are inclusive, so a product priced exactly at the bound stays in.
  return amount >= price.min && amount <= price.max;
}

/**
 * Filters a collection's products down to the current selection.
 *
 * Pure, and the product order is preserved — sorting is the API's job (`sortKey`/`reverse`
 * in `sort.ts`), so the already-sorted list comes out still sorted.
 */
export function applyFacets(products: ProductCard[], selected: SelectedFacets): ProductCard[] {
  return products.filter(
    (product) =>
      (!selected.onSale || product.isOnSale) &&
      matchesPrice(product, selected.price) &&
      matchesOptions(product, selected.options),
  );
}
