import { DEFAULT_SORT, SORT_PARAM, type SortOption } from "./sort";
import { serializeFacetsParam, type SelectedFacets, type SelectedPriceRange } from "./url";

// Turning a click into the next URL. The facet controls are client components, so every
// transition is expressed as a pure `SelectedFacets → SelectedFacets` step here and the
// component only pushes the result — the same split `sort.ts` already uses.
//
// Nothing mutates its input: the selection comes from a Server Component render and is
// reused across the sidebar, the drawer and the chips row.

/** Adds or removes one value on an option axis. Values within an axis are OR-ed (§5.1). */
export function toggleOptionValue(
  selected: SelectedFacets,
  name: string,
  value: string,
): SelectedFacets {
  const current = selected.options[name] ?? [];
  const next = current.includes(value)
    ? current.filter((candidate) => candidate !== value)
    : [...current, value];

  const options = { ...selected.options };
  // An axis with nothing selected is dropped rather than left empty, so it contributes no
  // param and the URL of an unfiltered collection stays bare.
  if (next.length === 0) delete options[name];
  else options[name] = next;

  return { ...selected, options };
}

/** Selects one price range, or clears it with `null`. Only one range fits in the URL. */
export function selectPriceRange(
  selected: SelectedFacets,
  price: SelectedPriceRange | null,
): SelectedFacets {
  return { ...selected, price };
}

export function setOnSale(selected: SelectedFacets, onSale: boolean): SelectedFacets {
  return { ...selected, onSale };
}

/** The empty selection "Clear all" returns to. A fresh object every call. */
export function clearFacets(): SelectedFacets {
  return { options: {}, price: null, onSale: false };
}

export function hasActiveFacets(selected: SelectedFacets): boolean {
  return (
    selected.onSale ||
    selected.price !== null ||
    Object.values(selected.options).some((values) => values.length > 0)
  );
}

/** How many separate filters are active, for the mobile trigger's "Filters (3)". */
export function countActiveFacets(selected: SelectedFacets): number {
  const options = Object.values(selected.options).reduce(
    (total, values) => total + values.length,
    0,
  );
  return options + (selected.price ? 1 : 0) + (selected.onSale ? 1 : 0);
}

/**
 * The collection URL for a selection and a sort, with the facet params first and `sort`
 * last, as §5.1 writes them.
 *
 * `URLSearchParams` percent-encodes the commas that separate multi-value axes. They are
 * legal unencoded in a query value (RFC 3986 sub-delims) and §5.1 shows them literally, so
 * they are put back — a shared `?color=moss,clay` should be readable.
 */
export function collectionHref(
  basePath: string,
  selected: SelectedFacets,
  sort: SortOption,
): string {
  const params = serializeFacetsParam(selected);
  if (sort !== DEFAULT_SORT) params.set(SORT_PARAM, sort);

  const query = params.toString().replaceAll("%2C", ",");
  return query ? `${basePath}?${query}` : basePath;
}
