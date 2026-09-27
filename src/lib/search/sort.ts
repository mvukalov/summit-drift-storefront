import { z } from "zod";
import type { SearchSortKeys } from "@/lib/graphql/generated/graphql";

// Same shape as `facets/sort.ts`, for the same reason: sort lives in the URL so results are
// shareable and rendered on the server. `search` only exposes two sort keys (verified
// 2026-09-27: `SearchSortKeys` has `PRICE` and `RELEVANCE`, no `BEST_SELLING`/`CREATED`), so
// "High to Low" is the same key reversed, exactly like the collection page's price sort.

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

const searchSortSchema = z
  .enum(SEARCH_SORT_OPTIONS.map((option) => option.value))
  .catch(DEFAULT_SEARCH_SORT);

/**
 * Reads the sort search param. Anything unexpected — missing, misspelled, or repeated
 * (`?sort=a&sort=b` arrives as an array) — falls back to the default instead of throwing,
 * so a hand-edited URL still renders a page.
 */
export function parseSearchSortParam(value: string | string[] | undefined): SearchSortOption {
  return searchSortSchema.parse(value);
}

export function toSearchSortVariables(sort: SearchSortOption): SearchSortVariables {
  return SEARCH_SORT_VARIABLES[sort];
}
