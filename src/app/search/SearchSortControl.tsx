"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/atoms/Select/Select";
import { searchHref } from "@/lib/search/params";
import {
  SEARCH_SORT_OPTIONS,
  parseSearchSortParam,
  type SearchSortOption,
} from "@/lib/search/sort";

export interface SearchSortControlProps {
  /** The query the results are for, carried into the new URL. */
  q: string;
  /** Current sort, resolved on the server from the URL. */
  value: SearchSortOption;
}

// Route-local, like the collection page's `SortControl`: the value comes from the server
// rather than `useSearchParams`, so no Suspense boundary is needed and the control always
// agrees with the rendered grid.
export function SearchSortControl({ q, value }: SearchSortControlProps) {
  const router = useRouter();

  function handleChange(nextValue: string) {
    // Back to page 1: page 3 of a different ordering is a different set of products.
    router.push(searchHref({ q, sort: parseSearchSortParam(nextValue), page: 1 }), {
      scroll: false,
    });
  }

  return (
    <Select
      inline
      label="Sort:"
      options={SEARCH_SORT_OPTIONS}
      value={value}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}
