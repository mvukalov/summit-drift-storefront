import { z } from "zod";
import type { ProductCollectionSortKeys } from "@/lib/graphql/generated/graphql";

// Sort is the first piece of URL state (project overview §5.1): the value lives in the
// search params, so a sorted collection is shareable and rendered on the server.

export const SORT_PARAM = "sort";

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "best-selling", label: "Best Selling" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortOption = "featured";

/** GraphQL variables for `products(sortKey:, reverse:)` on a collection. */
export interface SortVariables {
  sortKey: ProductCollectionSortKeys;
  reverse: boolean;
}

const SORT_VARIABLES: Record<SortOption, SortVariables> = {
  featured: { sortKey: "COLLECTION_DEFAULT", reverse: false },
  "price-asc": { sortKey: "PRICE", reverse: false },
  "price-desc": { sortKey: "PRICE", reverse: true },
  "best-selling": { sortKey: "BEST_SELLING", reverse: false },
};

const sortSchema = z.enum(SORT_OPTIONS.map((option) => option.value)).catch(DEFAULT_SORT);

/**
 * Reads the sort search param. Anything unexpected — missing, misspelled, or repeated
 * (`?sort=a&sort=b` arrives as an array) — falls back to the default instead of throwing,
 * so a hand-edited URL still renders a page.
 */
export function parseSortParam(value: string | string[] | undefined): SortOption {
  return sortSchema.parse(value);
}

export function toSortVariables(sort: SortOption): SortVariables {
  return SORT_VARIABLES[sort];
}
