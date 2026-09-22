import clsx from "clsx";
import type { CSSProperties, InputHTMLAttributes } from "react";
import styles from "./Swatch.module.scss";

export interface SwatchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "color" | "children"
> {
  /** Any CSS color. Comes from catalog data at runtime, so it is not a design token. */
  color: string;
  /** Always visible: color is never the only signal. */
  label: string;
  /** Radio group name; swatches sharing it are mutually exclusive. */
  name: string;
  selected?: boolean;
}

/** A selectable color option: a native radio styled as a pill with a color dot and label. */
export function Swatch({
  color,
  label,
  selected = false,
  disabled,
  className,
  ...rest
}: SwatchProps) {
  // Intentional exception to "no inline styles": the color is runtime catalog data, not a
  // design decision, so it is handed to the stylesheet as a custom property and only read
  // there through var(). Everything else stays in Swatch.module.scss.
  const colorStyle = { "--swatch-color": color } as CSSProperties;

  return (
    <label
      className={clsx(
        styles.swatch,
        selected && styles.selected,
        disabled && styles.disabled,
        className,
      )}
    >
      <input
        {...rest}
        type="radio"
        checked={selected}
        disabled={disabled}
        className={styles.input}
      />
      <span className={styles.dot} style={colorStyle} aria-hidden="true" />
      {label}
    </label>
  );
}
