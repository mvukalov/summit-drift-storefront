"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/atoms/Select/Select";
import {
  SORT_OPTIONS,
  serializeSortParam,
  type SortOption,
  parseSortParam,
} from "@/lib/facets/sort";

export interface SortControlProps {
  /** Current sort, resolved on the server from the URL. */
  value: SortOption;
  /** Collection path the sort param is appended to. */
  basePath: string;
}

// Route-local on purpose: `facets` is expected to redesign this toolbar (spec §Technical).
// The current value comes from the server rather than `useSearchParams`, so the control
// needs no Suspense boundary and always agrees with the rendered grid.
export function SortControl({ value, basePath }: SortControlProps) {
  const router = useRouter();

  function handleChange(nextValue: string) {
    const sort = parseSortParam(nextValue);
    // push, not replace: browser back returns to the previous sort order.
    router.push(`${basePath}${serializeSortParam(sort)}`, { scroll: false });
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
