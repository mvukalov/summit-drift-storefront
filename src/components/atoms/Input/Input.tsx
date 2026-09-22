import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import styles from "./Input.module.scss";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label, associated with the input. */
  label: string;
  /** Decorative leading icon, hidden from screen readers. */
  icon?: ReactNode;
}

export function Input({ label, id, icon, type = "text", className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <input {...rest} id={inputId} type={type} className={styles.input} />
      </div>
    </div>
  );
}
