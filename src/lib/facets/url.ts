import { z } from "zod";
import type { FacetGroups } from "./derive";
import { SORT_PARAM } from "./sort";

// Facet state lives in the search params (project overview §5.1), so a filtered collection
// is shareable, works with back/forward and renders on the server. The shape follows §5.1
// verbatim: one param per option axis, named after the axis, plus `sale` and `price`.
//
//   ?color=moss,slate&size=M&sale=1&price=25-200&sort=price-asc
//
// Multi-value axes are comma-separated rather than repeated params: it keeps a URL with
// several colors selected short enough to read, and `URLSearchParams.get()` returns the
// whole selection in one call instead of needing `getAll()`.
//
// Like `parseSortParam`, nothing here throws — a hand-edited or stale URL still renders a
// page. Values are validated against the facets actually derived from the collection, so
// `?color=purple` drops the filter and shows everything rather than matching zero products.

// Internal to this module: the URL shape is owned here, and callers go through
// `parseFacetsParam`/`serializeFacetsParam` rather than building params themselves.
const SALE_PARAM = "sale";
const PRICE_PARAM = "price";

/** The `sale=1` marker; any other value leaves the facet unselected. */
const SALE_ON = "1";

/** Params a facet axis may not claim, because the page already uses them for other state. */
const RESERVED_PARAMS = new Set([SORT_PARAM, "q", "page", "variant", SALE_PARAM, PRICE_PARAM]);

/** Next.js hands a route its search params in this shape; `?a=1&a=2` arrives as an array. */
export type FacetSearchParams = Record<string, string | string[] | undefined>;

export interface SelectedPriceRange {
  min: number;
  max: number;
}

export interface SelectedFacets {
  /** Option axis name → the raw values selected on it. Absent axes are unfiltered. */
  options: Record<string, string[]>;
  /** Inclusive bounds, or `null` when the full range is in play. */
  price: SelectedPriceRange | null;
  onSale: boolean;
}

/** `25-200`, or `25.5-200` — two non-negative numbers, low first. */
const priceSchema = z
  .string()
  .regex(/^\d+(\.\d+)?-\d+(\.\d+)?$/)
  .transform((value) => {
    const [min, max] = value.split("-").map(Number);
    return { min: min ?? 0, max: max ?? 0 };
  })
  .refine((range) => range.min <= range.max);

/** A repeated param (`?color=a&color=b`) is ambiguous next to the comma form; take the last. */
function readParam(params: FacetSearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value.at(-1) : value;
}

function splitValues(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Reads the facet search params against the collection's derived facets.
 *
 * Unknown axes, unknown values and malformed price ranges are dropped, duplicates are
 * collapsed, and a selection that covers the whole price span is treated as no price
 * filter at all so the canonical URL stays clean.
 */
export function parseFacetsParam(params: FacetSearchParams, facets: FacetGroups): SelectedFacets {
  const options: Record<string, string[]> = {};

  for (const facet of facets.options) {
    if (RESERVED_PARAMS.has(facet.name)) continue;

    const raw = readParam(params, facet.name);
    if (raw === undefined) continue;

    const available = new Set(facet.values.map((value) => value.value));
    // Deduplicated, and ordered by the facet so `?color=slate,moss` and `?color=moss,slate`
    // produce the same state and therefore the same canonical URL.
    const selected = [...new Set(splitValues(raw))].filter((value) => available.has(value));

    if (selected.length > 0) {
      options[facet.name] = facet.values
        .map((value) => value.value)
        .filter((value) => selected.includes(value));
    }
  }

  const rawPrice = readParam(params, PRICE_PARAM);
  const parsedPrice = rawPrice === undefined ? null : priceSchema.safeParse(rawPrice).data;
  const price = parsedPrice && facets.price ? clampPrice(parsedPrice, facets.price) : null;

  // Offering "on sale" when nothing is discounted would filter the grid down to nothing.
  const onSale = facets.saleCount > 0 && readParam(params, SALE_PARAM) === SALE_ON;

  return { options, price, onSale };
}

function clampPrice(
  selected: SelectedPriceRange,
  bounds: { min: number; max: number },
): SelectedPriceRange | null {
  const min = Math.max(selected.min, bounds.min);
  const max = Math.min(selected.max, bounds.max);
  // Outside the collection's span entirely, or covering all of it: no useful filter.
  if (min > max || (min <= bounds.min && max >= bounds.max)) return null;
  return { min, max };
}

/**
 * Turns the selection back into search params, ready to merge with `sort` into one query
 * string. Unselected facets contribute nothing, so an unfiltered collection keeps a bare URL.
 */
export function serializeFacetsParam(selected: SelectedFacets): URLSearchParams {
  const params = new URLSearchParams();

  for (const [name, values] of Object.entries(selected.options)) {
    if (values.length > 0) params.set(name, values.join(","));
  }

  if (selected.price) params.set(PRICE_PARAM, `${selected.price.min}-${selected.price.max}`);
  if (selected.onSale) params.set(SALE_PARAM, SALE_ON);

  return params;
}
