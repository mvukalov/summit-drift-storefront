import styles from "./FilterChip.module.scss";

export interface FilterChipProps {
  /** The filter as the shopper reads it, e.g. `Moss` or `Size M`. */
  label: string;
  onRemove: () => void;
}

/**
 * One active filter above the grid; activating it removes that filter.
 *
 * The whole chip is the button rather than a separate × next to a label, so the target is
 * comfortably over 44px and there is one tab stop per filter instead of two.
 */
export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <button
      type="button"
      className={styles.chip}
      // Starts with the visible label so speech input can activate it by name (WCAG 2.5.3).
      aria-label={`${label}, remove filter`}
      onClick={onRemove}
    >
      {label}
      <svg
        className={styles.icon}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
  );
}
