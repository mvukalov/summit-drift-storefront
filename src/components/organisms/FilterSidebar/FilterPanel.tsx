"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import { FacetGroup, type FacetGroupOption } from "@/components/molecules/FacetGroup/FacetGroup";
import type { FacetsView } from "@/lib/facets/counts";
import { collectionHref, selectPriceRange, setOnSale, toggleOptionValue } from "@/lib/facets/query";
import type { SortOption } from "@/lib/facets/sort";
import type { SelectedFacets } from "@/lib/facets/url";
import styles from "./FilterPanel.module.scss";

export interface FilterPanelProps {
  /** Facets and counts, computed on the server from the collection's products. */
  view: FacetsView;
  /** The selection the page was rendered with, read from the URL. */
  selected: SelectedFacets;
  /** Collection path the facet params are appended to. */
  basePath: string;
  /** Current sort, carried along so filtering never resets the order. */
  sort: SortOption;
  /** Runs after a navigation, so the drawer can close itself. */
  onNavigate?: () => void;
}

/** The "no price filter" radio. Empty so it cannot collide with a bucket id. */
const ANY_PRICE = "";

/**
 * Pills suit values that are abbreviations or numbers (`XS`, `M`, `36`); anything longer
 * (`Nylon Blend`, `Weather Resistant`) wraps badly and stays a list.
 */
function displayFor(options: FacetGroupOption[]): "list" | "pill" {
  return options.every((option) => option.label.length <= 4) ? "pill" : "list";
}

/**
 * The facet controls themselves, shared by the desktop sidebar and the mobile drawer.
 *
 * Every change is a navigation: the selection is rewritten as a pure value and pushed as a
 * URL, then the Server Component re-renders the grid and the counts. Nothing about the
 * result is kept in client state, so the page and the URL can never disagree.
 */
export function FilterPanel({ view, selected, basePath, sort, onNavigate }: FilterPanelProps) {
  const router = useRouter();
  // Each instance gets its own input names, so the two copies of the panel (sidebar and
  // drawer) never share a radio group or a label association.
  const scope = useId();

  function go(next: SelectedFacets) {
    // push, not replace: back returns to the previous set of filters.
    router.push(collectionHref(basePath, next, sort), { scroll: false });
    onNavigate?.();
  }

  function handlePriceChange(value: string) {
    const bucket = view.price.find((candidate) => candidate.id === value);
    go(selectPriceRange(selected, bucket ? { min: bucket.min, max: bucket.max } : null));
  }

  return (
    <div className={styles.panel}>
      {view.options.map((facet) => {
        const options: FacetGroupOption[] = facet.values.map((value) => ({
          value: value.value,
          label: value.label,
          count: value.count,
          selected: value.selected,
          color: value.color,
        }));

        return (
          <FacetGroup
            key={facet.name}
            legend={facet.label}
            name={`${scope}-${facet.name}`}
            display={displayFor(options)}
            options={options}
            onChange={(value) => go(toggleOptionValue(selected, facet.name, value))}
          />
        );
      })}

      {view.price.length > 0 && (
        <FacetGroup
          legend="Price range"
          name={`${scope}-price`}
          type="radio"
          options={[
            // Radios cannot be unchecked, so clearing the price needs an option of its own.
            { value: ANY_PRICE, label: "Any price", selected: selected.price === null },
            ...view.price.map((bucket) => ({
              value: bucket.id,
              label: bucket.label,
              count: bucket.count,
              selected: bucket.selected,
            })),
          ]}
          onChange={handlePriceChange}
        />
      )}

      {view.sale && (
        <FacetGroup
          legend="Availability"
          name={`${scope}-sale`}
          options={[
            {
              value: "sale",
              label: "On sale only",
              count: view.sale.count,
              selected: view.sale.selected,
            },
          ]}
          onChange={(_value, isSelected) => go(setOnSale(selected, isSelected))}
        />
      )}
    </div>
  );
}
