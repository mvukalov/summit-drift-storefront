import Link from "next/link";
import { buttonClassName } from "@/components/atoms/Button/Button";
import { searchHref } from "@/lib/search/params";
import type { SearchSortOption } from "@/lib/search/sort";
import styles from "./page.module.scss";

export interface SearchPaginationProps {
  q: string;
  sort: SearchSortOption;
  /** Already clamped by `paginate()`. */
  page: number;
  totalPages: number;
}

// A Server Component of plain links: each page is its own URL, so paging works without
// JavaScript, is shareable, and back/forward walk through it. Only links that lead somewhere
// are rendered — there is no such thing as a disabled link.
export function SearchPagination({ q, sort, page, totalPages }: SearchPaginationProps) {
  return (
    <nav aria-label="Pagination" className={styles.pagination}>
      {page > 1 && (
        <Link
          href={searchHref({ q, sort, page: page - 1 })}
          className={buttonClassName("secondary")}
        >
          Previous page
        </Link>
      )}
      <p className={styles.pageStatus}>
        Page {page} of {totalPages}
      </p>
      {page < totalPages && (
        <Link
          href={searchHref({ q, sort, page: page + 1 })}
          className={buttonClassName("secondary")}
        >
          Next page
        </Link>
      )}
    </nav>
  );
}
