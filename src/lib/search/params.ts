import { DEFAULT_SEARCH_SORT, SEARCH_SORT_PARAM, type SearchSortOption } from "./sort";

// Kept zod-free on purpose (`docs/performance.md`): this module is imported by the client-side
// `SearchCombobox`, so a zod schema here would ship the whole library to every page. Parsing
// (`parseSearchParams`) lives in `./parse` instead; this file only builds URLs.

export const SEARCH_PATH = "/search";

/** Next.js hands a route its search params in this shape; `?a=1&a=2` arrives as an array. */
export type SearchSearchParams = Record<string, string | string[] | undefined>;

export interface SearchParams {
  q: string;
  sort: SearchSortOption;
  page: number;
}

/**
 * The results-page URL for a query, sort and page — the inverse of `parseSearchParams`.
 * Defaults are left out (`sort=relevance`, `page=1`), so the URL a shopper shares stays as
 * short as what they typed, the same rule `collectionHref` follows.
 */
export function searchHref({ q, sort, page }: SearchParams): string {
  const params = new URLSearchParams({ q });
  if (sort !== DEFAULT_SEARCH_SORT) params.set(SEARCH_SORT_PARAM, sort);
  if (page > 1) params.set("page", String(page));
  return `${SEARCH_PATH}?${params.toString()}`;
}
