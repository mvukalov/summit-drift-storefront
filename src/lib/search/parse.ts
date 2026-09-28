import { z } from "zod";
import type { SearchSearchParams, SearchParams } from "./params";
import { DEFAULT_SEARCH_SORT, SEARCH_SORT_OPTIONS, SEARCH_SORT_PARAM, type SearchSortOption } from "./sort";

// Split out of `./params` and `./sort` (`docs/performance.md`): those two are imported by the
// client-side `SearchCombobox` for URL building only, so zod stayed out of them to keep it out
// of the client bundle. Parsing (RSC-only: `search/page.tsx`) lives here instead.

// Defensive, not a verified API limit (risk 7, `docs/predictive-search.md`): the API itself
// was not observed to reject long queries.
const MAX_QUERY_LENGTH = 200;

const qSchema = z.string().trim().max(MAX_QUERY_LENGTH).catch("");

// `page` is display-only pagination over an already-fetched array (`paginate.ts`), not a
// GraphQL cursor, so any non-positive-integer input just falls back to the first page.
const pageSchema = z.coerce.number().int().min(1).catch(1);

const searchSortSchema = z
  .enum(SEARCH_SORT_OPTIONS.map((option) => option.value))
  .catch(DEFAULT_SEARCH_SORT);

function readParam(params: SearchSearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value.at(-1) : value;
}

/**
 * Reads the sort search param. Anything unexpected — missing, misspelled, or repeated
 * (`?sort=a&sort=b` arrives as an array) — falls back to the default instead of throwing,
 * so a hand-edited URL still renders a page.
 */
export function parseSearchSortParam(value: string | string[] | undefined): SearchSortOption {
  return searchSortSchema.parse(value);
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
