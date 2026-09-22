import type { ReactNode } from "react";
import styles from "./VisuallyHidden.module.scss";

export interface VisuallyHiddenProps {
  /** Text for screen readers only. */
  children: ReactNode;
}

/** Hides content visually while keeping it in the accessibility tree. */
export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return <span className={styles.visuallyHidden}>{children}</span>;
}
