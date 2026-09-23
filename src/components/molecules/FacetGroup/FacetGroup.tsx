import clsx from "clsx";
import type { CSSProperties } from "react";
import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import styles from "./FacetGroup.module.scss";

export interface FacetGroupOption {
  value: string;
  label: string;
  /** Products left if this value is chosen. Omitted for an option that filters nothing. */
  count?: number;
  selected: boolean;
  /** CSS color for a swatch dot. Catalog data, so it is never a design token. */
  color?: string | null;
}

export interface FacetGroupProps {
  /** The axis name, e.g. `Color`. Becomes the group's legend. */
  legend: string;
  /** Shared input name; radio options within one group are mutually exclusive. */
  name: string;
  /** `checkbox` for multi-select axes (§5.1 OR-s values), `radio` where only one fits. */
  type?: "checkbox" | "radio";
  /** `pill` lays short values out as a row of chips, as the size picker in the mockups. */
  display?: "list" | "pill";
  options: FacetGroupOption[];
  onChange: (value: string, selected: boolean) => void;
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "product" : "products"}`;
}

/**
 * One labelled group of facet values: a real `<fieldset>` of native inputs, so the group
 * name is announced with each option and keyboard behaviour is the platform's.
 *
 * The inputs are visually replaced by rows or pills, but stay in the accessibility tree
 * and the tab order — the same technique the `Swatch` atom uses.
 */
export function FacetGroup({
  legend,
  name,
  type = "checkbox",
  display = "list",
  options,
  onChange,
}: FacetGroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={clsx(styles.options, display === "pill" && styles.pills)}>
        {options.map((option) => (
          <label
            key={option.value}
            className={clsx(styles.option, option.selected && styles.selected)}
          >
            <input
              type={type}
              name={name}
              value={option.value}
              checked={option.selected}
              className={styles.input}
              onChange={(event) => onChange(option.value, event.target.checked)}
            />
            {option.color ? (
              <span
                className={styles.dot}
                // The one inline style the standards allow: a runtime catalog color handed
                // to the stylesheet as a custom property, read there through var().
                style={{ "--facet-dot-color": option.color } as CSSProperties}
                aria-hidden="true"
              />
            ) : (
              // A row needs a visible box or circle to show its state; a pill shows it by
              // being filled, and a swatch by the ring around its dot.
              display === "list" && (
                <span
                  className={clsx(styles.marker, type === "radio" && styles.round)}
                  aria-hidden="true"
                />
              )
            )}
            <span className={styles.label}>{option.label}</span>
            {option.count !== undefined && (
              <>
                <span className={styles.count} aria-hidden="true">
                  {option.count}
                </span>
                {/* The bare number would be read as part of the name ("Moss 6"). */}
                <VisuallyHidden>, {countLabel(option.count)}</VisuallyHidden>
              </>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
