"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/atoms/Select/Select";
import { collectionHref } from "@/lib/facets/query";
import { SORT_OPTIONS, parseSortParam, type SortOption } from "@/lib/facets/sort";
import type { SelectedFacets } from "@/lib/facets/url";

export interface SortControlProps {
  /** Current sort, resolved on the server from the URL. */
  value: SortOption;
  /** Active facets, carried into the new URL so sorting never clears the filters. */
  selected: SelectedFacets;
  /** Collection path the params are appended to. */
  basePath: string;
}

// Route-local: this is the collection page's toolbar control, and `search` will build its
// own. The current value comes from the server rather than `useSearchParams`, so the
// control needs no Suspense boundary and always agrees with the rendered grid.
export function SortControl({ value, selected, basePath }: SortControlProps) {
  const router = useRouter();

  function handleChange(nextValue: string) {
    const sort = parseSortParam(nextValue);
    // push, not replace: browser back returns to the previous sort order.
    router.push(collectionHref(basePath, selected, sort), { scroll: false });
  }

  return (
    <Select
      inline
      label="Sort:"
      options={SORT_OPTIONS}
      value={value}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}
