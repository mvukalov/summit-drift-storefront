import { z } from "zod";
import {
  DEFAULT_SEARCH_SORT,
  SEARCH_SORT_PARAM,
  parseSearchSortParam,
  type SearchSortOption,
} from "./sort";

export const SEARCH_PATH = "/search";

/** Next.js hands a route its search params in this shape; `?a=1&a=2` arrives as an array. */
export type SearchSearchParams = Record<string, string | string[] | undefined>;

export interface SearchParams {
  q: string;
  sort: SearchSortOption;
  page: number;
}

// Defensive, not a verified API limit (risk 7, `docs/predictive-search.md`): the API itself
// was not observed to reject long queries.
const MAX_QUERY_LENGTH = 200;

const qSchema = z.string().trim().max(MAX_QUERY_LENGTH).catch("");

// `page` is display-only pagination over an already-fetched array (`paginate.ts`), not a
// GraphQL cursor, so any non-positive-integer input just falls back to the first page.
const pageSchema = z.coerce.number().int().min(1).catch(1);

function readParam(params: SearchSearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value.at(-1) : value;
}

/**
 * Reads `q`/`sort`/`page` from the URL. Mirrors `parseSortParam`/`parseFacetsParam`: never
 * throws, so a hand-edited or stale URL still renders a page instead of erroring.
 */
export function parseSearchParams(params: SearchSearchParams): SearchParams {
  return {
    q: qSchema.parse(readParam(params, "q") ?? ""),
    sort: parseSearchSortParam(params[SEARCH_SORT_PARAM]),
    page: pageSchema.parse(readParam(params, "page")),
  };
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
