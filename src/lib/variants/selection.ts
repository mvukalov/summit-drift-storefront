import type { ProductOption, ProductVariant } from "@/types/catalog";

// Resolving a URL to a variant, and a click to the next URL.
//
// The selection lives in the search params as one param per option axis, carrying the raw
// API value: `?color=moss&size=M`. That is the convention `parseFacetsParam` already set for
// collections — raw values, matched exactly — so the two pages read the same way and there
// is no second casing rule to keep in sync (src/lib/facets/url.ts).
//
// Everything here is pure. The picker is a client component, but it only pushes what these
// functions return.

/** Option axis name → the single value chosen on it. Absent axes are unchosen. */
export type VariantSelection = Record<string, string>;

/** Next.js hands a route its search params in this shape. */
export type VariantSearchParams = Record<string, string | string[] | undefined>;

/** A repeated param (`?color=a&color=b`) is ambiguous; take the last, as facets do. */
function readParam(params: VariantSearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value.at(-1) : value;
}

/**
 * Reads the option params against the axes the product actually offers.
 *
 * Unknown axes and values the axis does not list are dropped rather than rejected, so a
 * stale or hand-edited link still renders a product page instead of a 404.
 */
export function parseVariantSelection(
  params: VariantSearchParams,
  options: readonly ProductOption[],
): VariantSelection {
  const selection: VariantSelection = {};

  for (const option of options) {
    const raw = readParam(params, option.name);
    if (raw === undefined) continue;
    if (option.values.includes(raw)) selection[option.name] = raw;
  }

  return selection;
}

/** The selection that identifies a variant, for reading the current state back out of one. */
export function selectionFromVariant(variant: ProductVariant): VariantSelection {
  const selection: VariantSelection = {};
  for (const option of variant.selectedOptions) selection[option.name] = option.value;
  return selection;
}

function matchesSelection(variant: ProductVariant, selection: VariantSelection): boolean {
  return variant.selectedOptions.every((option) => {
    const chosen = selection[option.name];
    // An axis with nothing chosen constrains nothing.
    return chosen === undefined || chosen === option.value;
  });
}

/** The variant matching every axis exactly, or `null` when the combination doesn't exist. */
export function findExactVariant(
  variants: readonly ProductVariant[],
  selection: VariantSelection,
): ProductVariant | null {
  return (
    variants.find(
      (variant) =>
        variant.selectedOptions.length === Object.keys(selection).length &&
        matchesSelection(variant, selection),
    ) ?? null
  );
}

/** Prefers something the shopper can actually buy, falling back to the first of the set. */
function preferAvailable(variants: readonly ProductVariant[]): ProductVariant | undefined {
  return variants.find((variant) => variant.availableForSale) ?? variants[0];
}

/**
 * The variant the page should show for a given selection.
 *
 * A partial selection (`?color=moss` with no size) is legitimate — it is what a shared link
 * looks like when only one axis was picked — so the remaining axes fall back to the first
 * purchasable variant that fits. A selection matching nothing at all falls back to the
 * product's own default rather than rendering an empty page.
 *
 * Returns `null` only for a product with no variants, which the API does not produce here.
 */
export function resolveVariant(
  variants: readonly ProductVariant[],
  selection: VariantSelection,
): ProductVariant | null {
  if (variants.length === 0) return null;

  const matching = variants.filter((variant) => matchesSelection(variant, selection));

  // `variants` is non-empty here, so the fallback always resolves to something.
  return preferAvailable(matching) ?? preferAvailable(variants) ?? null;
}

/**
 * Whether choosing `value` on the `name` axis leads to a variant that is in stock, with the
 * other axes held where they are.
 *
 * This is what disables impossible combinations in the picker. The current catalog has no
 * unavailable variant (0 of 360, verified 2026-09-23), so this path is exercised by unit
 * tests rather than by real data — but a real store would hit it constantly.
 */
export function isOptionValueAvailable(
  variants: readonly ProductVariant[],
  selection: VariantSelection,
  name: string,
  value: string,
): boolean {
  // The other axes stay as they are; this one is replaced by the candidate value.
  const candidate: VariantSelection = { ...selection, [name]: value };

  return variants.some(
    (variant) => variant.availableForSale && matchesSelection(variant, candidate),
  );
}

/**
 * The URL for a selection. Every axis is written out, so the link is unambiguous and lands
 * on the same variant for whoever opens it.
 */
export function productHref(handle: string, selection: VariantSelection): string {
  const params = new URLSearchParams();
  // Sorted, so the same variant always produces the same URL regardless of click order.
  for (const name of Object.keys(selection).sort()) {
    const value = selection[name];
    if (value !== undefined) params.set(name, value);
  }

  const query = params.toString();
  return query ? `/products/${handle}?${query}` : `/products/${handle}`;
}

/** The next selection after choosing one value on one axis. */
export function selectOptionValue(
  selection: VariantSelection,
  name: string,
  value: string,
): VariantSelection {
  return { ...selection, [name]: value };
}
