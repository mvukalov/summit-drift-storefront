"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import { isColorAxis, toCssColor } from "@/lib/format/colors";
import { formatOptionName, formatOptionValue } from "@/lib/format/options";
import {
  isOptionValueAvailable,
  productHref,
  selectOptionValue,
  type VariantSelection,
} from "@/lib/variants/selection";
import type { ProductOption, ProductVariant } from "@/types/catalog";
import styles from "./VariantPicker.module.scss";

export interface VariantPickerProps {
  handle: string;
  options: ProductOption[];
  variants: ProductVariant[];
  /** The currently resolved selection, one value per axis. */
  selection: VariantSelection;
}

/**
 * The option axes, as one radio group per axis.
 *
 * Choosing a value pushes a new URL rather than setting local state, so the selected
 * variant survives a reload, is shareable, and is what the server rendered (§5.2). The
 * page re-renders from the search params; this component holds no state of its own.
 *
 * Native radios inside a `<fieldset>` give the group semantics and arrow-key navigation for
 * free, so nothing here re-implements them — the same approach `FacetGroup` takes.
 */
export function VariantPicker({ handle, options, variants, selection }: VariantPickerProps) {
  const router = useRouter();

  function handleSelect(name: string, value: string) {
    const next = selectOptionValue(selection, name, value);
    // `scroll: false`: changing a size should not throw the shopper back to the top of the
    // page, the same reason the facet controls pass it.
    router.push(productHref(handle, next), { scroll: false });
  }

  return (
    <div className={styles.picker}>
      {options.map((option) => {
        const isColor = isColorAxis(option.name);
        const legend = formatOptionName(option.name);

        return (
          <fieldset key={option.name} className={styles.group}>
            <legend className={styles.legend}>
              {legend}
              {/* The chosen value belongs in the legend, not just in the checked state, so
                  it reads as "Color: Moss" at a glance and to a screen reader. */}
              <span className={styles.chosen}>
                {formatOptionValue(selection[option.name] ?? "")}
              </span>
            </legend>

            <div className={clsx(styles.values, isColor && styles.swatches)}>
              {option.values.map((value) => {
                const selected = selection[option.name] === value;
                const available = isOptionValueAvailable(variants, selection, option.name, value);
                const color = isColor ? toCssColor(value) : null;

                return (
                  <label
                    key={value}
                    className={clsx(
                      styles.value,
                      selected && styles.selected,
                      !available && styles.unavailable,
                    )}
                  >
                    <input
                      type="radio"
                      name={option.name}
                      value={value}
                      checked={selected}
                      // Not `disabled`: a sold-out combination has to stay reachable so the
                      // shopper can select it and see why. It is marked instead, and the
                      // "Add to cart" button is what actually turns off.
                      className={styles.input}
                      onChange={() => handleSelect(option.name, value)}
                    />
                    {color && (
                      // The one inline style the standards allow: a runtime catalog color
                      // handed to the stylesheet as a custom property.
                      <span
                        className={styles.dot}
                        style={{ "--variant-dot-color": color } as CSSProperties}
                        aria-hidden="true"
                      />
                    )}
                    {/* Color is never the only signal: the value is always spelled out. */}
                    <span className={styles.label}>{formatOptionValue(value)}</span>
                    {!available && <VisuallyHidden>&nbsp;(out of stock)</VisuallyHidden>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
