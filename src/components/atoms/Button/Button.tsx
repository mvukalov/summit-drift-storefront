import clsx from "clsx";
import type { ComponentPropsWithRef } from "react";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Button.module.scss";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  /** Shows a spinner, sets `aria-busy` and blocks interaction until the action settles. */
  loading?: boolean;
}

/** Button styling for other elements, e.g. a `next/link` call to action that should look like a button. */
export function buttonClassName(variant: ButtonVariant = "primary", className?: string): string {
  return clsx(styles.button, styles[variant], className);
}

export function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName(variant, className)}
    >
      {/* The space keeps "Loading" and the label as separate words in the accessible name;
          flex layout ignores whitespace-only text, so it adds no visual gap. */}
      {loading && (
        <>
          <Spinner />{" "}
        </>
      )}
      {children}
    </button>
  );
}
