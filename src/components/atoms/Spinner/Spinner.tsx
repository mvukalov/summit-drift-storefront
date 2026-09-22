import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden";
import styles from "./Spinner.module.scss";

export interface SpinnerProps {
  /** Announced to screen readers. */
  label?: string;
}

/** Indeterminate loading indicator. Takes the current text color. */
export function Spinner({ label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" className={styles.spinner}>
      <span className={styles.ring} aria-hidden="true" />
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  );
}
