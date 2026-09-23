"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { QuantityStepper } from "@/components/molecules/QuantityStepper/QuantityStepper";
import styles from "./AddToCart.module.scss";

export interface AddToCartProps {
  /** Whether the selected variant can be bought. */
  available: boolean;
}

// The API accepts any quantity and reports `quantityAvailable: null` on every variant, so
// the ceiling is a frontend rule (project overview §2, §5.3). The cart feature enforces the
// same limit per line.
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 10;

/**
 * Quantity plus the "Add to cart" button.
 *
 * The button is deliberately inert: the cart does not exist yet, so this feature ships the
 * control, its states and its keyboard behaviour, and the `cart` feature wires up the
 * action. It is a real enabled button when the variant is available, so the disabled state
 * below means "out of stock" and nothing else.
 */
export function AddToCart({ available }: AddToCartProps) {
  const [quantity, setQuantity] = useState(MIN_QUANTITY);

  return (
    <div className={styles.addToCart}>
      {/* Out of stock is stated in text, never by the disabled styling alone (§8). */}
      {!available && (
        <p className={styles.soldOut} role="status">
          This option is out of stock. Choose another combination to continue.
        </p>
      )}

      <div className={styles.row}>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          min={MIN_QUANTITY}
          max={MAX_QUANTITY}
          disabled={!available}
        />

        <Button className={styles.submit} disabled={!available}>
          {available ? "Add to cart" : "Out of stock"}
        </Button>
      </div>
    </div>
  );
}
