// `search(first: 250)` returns the whole matching set in one request (the catalog is 30
// products total, verified 2026-09-27), so pagination is display-only: slice the already-
// fetched array by page number instead of a GraphQL cursor. Documented limit, same shape as
// the collection page's "fetch everything, work with it in pure functions" pattern — revisit
// only if the catalog grows past ~250 products.

// 4 rows at the grid's 4-column breakpoint.
export const SEARCH_PAGE_SIZE = 16;

export interface Paginated<T> {
  items: T[];
  /** Clamped to `[1, totalPages]`, so an out-of-range `?page=` still renders something. */
  page: number;
  totalPages: number;
}

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number = SEARCH_PAGE_SIZE,
): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const start = (clampedPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: clampedPage,
    totalPages,
  };
}
