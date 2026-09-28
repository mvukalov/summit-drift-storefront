import type { SearchSortKeys } from "@/lib/graphql/generated/graphql";

// Same shape as `facets/sort.ts`, for the same reason: sort lives in the URL so results are
// shareable and rendered on the server. `search` only exposes two sort keys (verified
// 2026-09-27: `SearchSortKeys` has `PRICE` and `RELEVANCE`, no `BEST_SELLING`/`CREATED`), so
// "High to Low" is the same key reversed, exactly like the collection page's price sort.
//
// Kept zod-free on purpose (`docs/performance.md`): this module is imported by the client-side
// `SearchCombobox`, so a zod schema here would ship the whole library to every page. Parsing the
// `sort` search param lives in `./parse` instead.

export const SEARCH_SORT_PARAM = "sort";

export const SEARCH_SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
] as const;

export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number]["value"];

export const DEFAULT_SEARCH_SORT: SearchSortOption = "relevance";

/** GraphQL variables for `search(sortKey:, reverse:)`. */
export interface SearchSortVariables {
  sortKey: SearchSortKeys;
  reverse: boolean;
}

const SEARCH_SORT_VARIABLES: Record<SearchSortOption, SearchSortVariables> = {
  relevance: { sortKey: "RELEVANCE", reverse: false },
  "price-asc": { sortKey: "PRICE", reverse: false },
  "price-desc": { sortKey: "PRICE", reverse: true },
};

export function toSearchSortVariables(sort: SearchSortOption): SearchSortVariables {
  return SEARCH_SORT_VARIABLES[sort];
}
