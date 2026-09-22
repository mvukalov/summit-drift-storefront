import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import clsx from "clsx";
import styles from "./Select.module.scss";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Visible label, associated with the select. */
  label: string;
  options: readonly SelectOption[];
  /** Puts the label beside the control instead of above it, for toolbars. */
  inline?: boolean;
}

// A native <select> on purpose: keyboard support, mobile pickers and listbox semantics
// come for free, and only the presentation is themed (visual language matching Input).
export function Select({ label, options, id, inline = false, className, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={clsx(inline && styles.inline, className)}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <select {...rest} id={selectId} className={styles.select}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* The native arrow is replaced so the control matches Input's border and radius. */}
        <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
