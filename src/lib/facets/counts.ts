import { isColorAxis, toCssColor } from "@/lib/format/colors";
import { formatAmount } from "@/lib/format/money";
import type { ProductCard } from "@/types/catalog";
import { applyFacets } from "./apply";
import type { FacetGroups, PriceFacet } from "./derive";
import type { SelectedFacets } from "./url";

// The view model the facet UI renders: every facet value with the number of products it
// would leave on the page, and whether it is currently selected.
//
// Counts reflect the *other* active facets (project overview §5.1): with `color=moss`
// chosen, the size counts describe moss products only, while the color counts keep
// describing the whole collection — otherwise picking Moss would drop Slate and Clay to
// zero and there would be no way to switch color without clearing the filter first.
//
// Everything here composes phase 1's `applyFacets`; no matching logic is repeated.

export interface FacetValueView {
  value: string;
  label: string;
  count: number;
  selected: boolean;
  /** CSS color for the dot on a color axis; `null` on textual axes and unknown values. */
  color: string | null;
}

export interface OptionFacetView {
  name: string;
  label: string;
  values: FacetValueView[];
}

export interface PriceBucketView {
  /** Stable id for the radio input; the range itself is what travels in the URL. */
  id: string;
  label: string;
  min: number;
  max: number;
  count: number;
  selected: boolean;
}

export interface SaleFacetView {
  count: number;
  selected: boolean;
}

/** One removable chip above the grid. The shape says which facet a removal has to clear. */
export type ActiveFilter =
  | { id: string; label: string; kind: "option"; name: string; value: string }
  | { id: string; label: string; kind: "price" }
  | { id: string; label: string; kind: "sale" };

export interface FacetsView {
  options: OptionFacetView[];
  /** Empty when a price filter could not narrow this collection; see `buildPriceBuckets`. */
  price: PriceBucketView[];
  /** `null` when nothing in the collection is discounted. */
  sale: SaleFacetView | null;
  /** The chips row, in the order the facets are shown. Empty when nothing is filtered. */
  active: ActiveFilter[];
}

/**
 * Price is offered as fixed buckets rather than a free min/max pair: one tap, no typing,
 * and a single bucket maps onto phase 1's single `price=min-max` range, which cannot
 * express a multi-select.
 *
 * `CENT` keeps neighbouring buckets from both claiming a product priced exactly on a
 * boundary, because phase 1's range is inclusive at both ends.
 */
const PRICE_THRESHOLDS = [50, 150];
const CENT = 0.01;

interface PriceBucketDefinition {
  id: string;
  label: string;
  min: number;
  max: number;
}

/** A fresh, empty selection. Never a shared constant — phase 1 was bitten by that. */
function noSelection(): SelectedFacets {
  return { options: {}, price: null, onSale: false };
}

function countMatching(products: ProductCard[], selected: SelectedFacets): number {
  return applyFacets(products, selected).length;
}

function withoutAxis(selected: SelectedFacets, name: string): SelectedFacets {
  const options = { ...selected.options };
  delete options[name];
  return { ...selected, options };
}

function buildOptionFacets(
  products: ProductCard[],
  facets: FacetGroups,
  selected: SelectedFacets,
): OptionFacetView[] {
  return facets.options.map((facet) => {
    // Every other facet still applies, so the counts say what this axis would leave.
    const base = applyFacets(products, withoutAxis(selected, facet.name));
    const active = selected.options[facet.name] ?? [];
    const isColor = isColorAxis(facet.name);

    return {
      name: facet.name,
      label: facet.label,
      values: facet.values.map((value) => ({
        value: value.value,
        label: value.label,
        count: countMatching(base, { ...noSelection(), options: { [facet.name]: [value.value] } }),
        selected: active.includes(value.value),
        color: isColor ? toCssColor(value.value) : null,
      })),
    };
  });
}

/** `Under $50`, `$50 – $150`, `$150+` — the spans the thresholds cut the range into. */
function priceBucketDefinitions({ currencyCode }: PriceFacet): PriceBucketDefinition[] {
  const definitions: PriceBucketDefinition[] = PRICE_THRESHOLDS.map((threshold, index) => {
    const previous = PRICE_THRESHOLDS[index - 1];

    return previous === undefined
      ? {
          id: `under-${threshold}`,
          label: `Under ${formatAmount(threshold, currencyCode)}`,
          min: 0,
          max: threshold - CENT,
        }
      : {
          id: `${previous}-${threshold}`,
          label: `${formatAmount(previous, currencyCode)} – ${formatAmount(threshold, currencyCode)}`,
          min: previous,
          max: threshold - CENT,
        };
  });

  const highest = PRICE_THRESHOLDS.at(-1);
  if (highest !== undefined) {
    definitions.push({
      id: `${highest}-plus`,
      label: `${formatAmount(highest, currencyCode)}+`,
      min: highest,
      max: Number.POSITIVE_INFINITY,
    });
  }

  return definitions;
}

function buildPriceBuckets(
  products: ProductCard[],
  facets: FacetGroups,
  selected: SelectedFacets,
): PriceBucketView[] {
  const { price } = facets;
  if (!price) return [];

  const base = applyFacets(products, { ...selected, price: null });

  const buckets = priceBucketDefinitions(price)
    // Clamped to the collection's own span, so the URL never asks for a price the shop
    // does not stock and `parseFacetsParam` reads the range back unchanged.
    .map((definition) => ({
      ...definition,
      min: Math.max(definition.min, price.min),
      max: Math.min(definition.max, price.max),
    }))
    .filter((bucket) => bucket.min <= bucket.max)
    .map((bucket) => ({
      ...bucket,
      count: countMatching(base, { ...noSelection(), price: { min: bucket.min, max: bucket.max } }),
      selected:
        selected.price !== null &&
        selected.price.min === bucket.min &&
        selected.price.max === bucket.max,
    }))
    // An empty bucket is noise — unless it is the one currently applied, which would
    // otherwise vanish from the sidebar and leave no way to change or clear it there.
    .filter((bucket) => bucket.count > 0 || bucket.selected);

  // A single bucket holds every product, so choosing it would filter nothing: the whole
  // group is noise. This also keeps the UI in step with `parseFacetsParam`, which drops a
  // range covering the full span. An active range always keeps the group, so it can be
  // changed or cleared where it was set.
  const narrowsAnything = buckets.filter((bucket) => bucket.count > 0).length > 1;
  return narrowsAnything || selected.price !== null ? buckets : [];
}

function buildSaleFacet(
  products: ProductCard[],
  facets: FacetGroups,
  selected: SelectedFacets,
): SaleFacetView | null {
  if (facets.saleCount === 0) return null;

  const base = applyFacets(products, { ...selected, onSale: false });

  return {
    count: countMatching(base, { ...noSelection(), onSale: true }),
    selected: selected.onSale,
  };
}

/**
 * "Moss" says what it filters on its own; "M" and "36" do not, so those chips carry their
 * axis: "Size M". The test is the one `formatOptionValue` already uses — a label with no
 * lowercase letter is an abbreviation or a number, not a word.
 */
function chipLabel(facetLabel: string, valueLabel: string): string {
  return /[a-z]/.test(valueLabel) ? valueLabel : `${facetLabel} ${valueLabel}`;
}

function buildActiveFilters(
  options: OptionFacetView[],
  price: PriceBucketView[],
  sale: SaleFacetView | null,
  selected: SelectedFacets,
  priceFacet: PriceFacet | null,
): ActiveFilter[] {
  const active: ActiveFilter[] = options.flatMap((facet) =>
    facet.values
      .filter((value) => value.selected)
      .map((value) => ({
        id: `${facet.name}:${value.value}`,
        label: chipLabel(facet.label, value.label),
        kind: "option" as const,
        name: facet.name,
        value: value.value,
      })),
  );

  // `parseFacetsParam` only keeps a range when the collection has a price span, so the
  // two are always set together.
  if (selected.price && priceFacet) {
    const { currencyCode } = priceFacet;
    // A hand-written `?price=30-40` matches no bucket, so fall back to its own bounds.
    const bucket = price.find((candidate) => candidate.selected);
    active.push({
      id: "price",
      label:
        bucket?.label ??
        `${formatAmount(selected.price.min, currencyCode)} – ${formatAmount(selected.price.max, currencyCode)}`,
      kind: "price",
    });
  }

  if (sale?.selected) {
    active.push({ id: "sale", label: "On sale", kind: "sale" });
  }

  return active;
}

/**
 * Builds the facet UI's view model from a collection's products, the facets derived from
 * them and the selection read out of the URL.
 *
 * Pure: the same inputs always give the same output, so the server renders it and the
 * client only has to display it.
 */
export function buildFacetsView(
  products: ProductCard[],
  facets: FacetGroups,
  selected: SelectedFacets,
): FacetsView {
  const options = buildOptionFacets(products, facets, selected);
  const price = buildPriceBuckets(products, facets, selected);
  const sale = buildSaleFacet(products, facets, selected);

  return {
    options,
    price,
    sale,
    active: buildActiveFilters(options, price, sale, selected, facets.price),
  };
}
