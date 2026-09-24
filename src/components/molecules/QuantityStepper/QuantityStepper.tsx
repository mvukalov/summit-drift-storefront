"use client";

import { useId, useState, type ChangeEvent, type FocusEvent } from "react";
import { Button } from "@/components/atoms/Button/Button";
import styles from "./QuantityStepper.module.scss";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Lowest selectable quantity. */
  min?: number;
  /** Highest selectable quantity, or `undefined` for no ceiling. */
  max?: number;
  label?: string;
  disabled?: boolean;
}

function clamp(value: number, min: number, max: number | undefined): number {
  if (value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

/**
 * A controlled number input with decrement and increment buttons.
 *
 * The buttons are real `<button>`s rather than the native spinner, so each one is the full
 * 44px touch target. The input stays `type="number"` for a numeric on-screen keyboard.
 *
 * While the field has focus it renders what was typed rather than the committed value.
 * Without that, clearing the field would immediately snap it back to the old number (a
 * controlled input re-renders from its prop), and the next keystroke would append to it —
 * clearing "1" and typing "5" would produce 15. On blur the typed text is parsed, clamped
 * and committed, so the field can never settle on a quantity that isn't in play.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = "Quantity",
  disabled = false,
}: QuantityStepperProps) {
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);

  function commit(next: number) {
    setDraft(null);
    onChange(clamp(next, min, max));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    setDraft(raw);

    // Out-of-range input is left uncommitted until blur, so typing "12" toward a maximum of
    // 10 isn't clamped out from under the caret mid-keystroke.
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed === clamp(parsed, min, max)) onChange(parsed);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const parsed = Number.parseInt(event.target.value, 10);
    commit(Number.isNaN(parsed) ? min : parsed);
  }

  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className={styles.stepper}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.controls}>
        <Button
          variant="secondary"
          className={styles.step}
          aria-label="Decrease quantity"
          disabled={disabled || atMin}
          onClick={() => commit(value - 1)}
        >
          <span aria-hidden="true">&minus;</span>
        </Button>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          className={styles.input}
          value={draft ?? String(value)}
          min={min}
          max={max}
          disabled={disabled}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <Button
          variant="secondary"
          className={styles.step}
          aria-label="Increase quantity"
          disabled={disabled || atMax}
          onClick={() => commit(value + 1)}
        >
          <span aria-hidden="true">+</span>
        </Button>
      </div>
    </div>
  );
}
