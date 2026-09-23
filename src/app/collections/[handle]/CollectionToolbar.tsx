"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { FilterChip } from "@/components/molecules/FilterChip/FilterChip";
import { FilterDrawer } from "@/components/organisms/FilterSidebar/FilterDrawer";
import type { ActiveFilter, FacetsView } from "@/lib/facets/counts";
import {
  clearFacets,
  collectionHref,
  selectPriceRange,
  setOnSale,
  toggleOptionValue,
} from "@/lib/facets/query";
import type { SortOption } from "@/lib/facets/sort";
import type { SelectedFacets } from "@/lib/facets/url";
import { SortControl } from "./SortControl";
import styles from "./CollectionToolbar.module.scss";

export interface CollectionToolbarProps {
  view: FacetsView;
  selected: SelectedFacets;
  sort: SortOption;
  basePath: string;
  /** Products left after filtering — what the count announces. */
  resultCount: number;
}

/**
 * The row above the grid: the result count, the mobile filter trigger, sort, and a chip
 * per active filter.
 *
 * It owns focus after a filter is removed. A chip deletes itself from the DOM, which would
 * drop focus to `<body>` and strand a keyboard user at the top of the document, so focus
 * moves to the count — the one element that is always there and that states what changed.
 */
export function CollectionToolbar({
  view,
  selected,
  sort,
  basePath,
  resultCount,
}: CollectionToolbarProps) {
  const router = useRouter();
  const countRef = useRef<HTMLParagraphElement>(null);

  function go(next: SelectedFacets) {
    router.push(collectionHref(basePath, next, sort), { scroll: false });
    // The count element survives the re-render, so focus can move now rather than in an
    // effect that would have to wait for the server's response.
    countRef.current?.focus();
  }

  function removeFilter(filter: ActiveFilter) {
    switch (filter.kind) {
      case "option":
        go(toggleOptionValue(selected, filter.name, filter.value));
        break;
      case "price":
        go(selectPriceRange(selected, null));
        break;
      case "sale":
        go(setOnSale(selected, false));
        break;
    }
  }

  return (
    <div className={styles.toolbar}>
      <p
        ref={countRef}
        tabIndex={-1}
        // Announces the new total after a filter or sort change, without moving the page.
        aria-live="polite"
        className={styles.count}
      >
        {resultCount} {resultCount === 1 ? "product" : "products"}
      </p>

      <div className={styles.controls}>
        <FilterDrawer
          view={view}
          selected={selected}
          basePath={basePath}
          sort={sort}
          resultCount={resultCount}
        />
        <SortControl value={sort} selected={selected} basePath={basePath} />
      </div>

      {view.active.length > 0 && (
        <div className={styles.chips}>
          <ul className={styles.chipList} aria-label="Active filters">
            {view.active.map((filter) => (
              <li key={filter.id}>
                <FilterChip label={filter.label} onRemove={() => removeFilter(filter)} />
              </li>
            ))}
          </ul>
          <Button variant="ghost" className={styles.clear} onClick={() => go(clearFacets())}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
