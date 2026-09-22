import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Badge.module.scss";

export type BadgeTone = "accent" | "neutral";

export interface BadgeProps {
  children: ReactNode;
  /** `accent` draws attention (e.g. a sale); `neutral` for everything else. */
  tone?: BadgeTone;
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={clsx(styles.badge, styles[tone])}>{children}</span>;
}
