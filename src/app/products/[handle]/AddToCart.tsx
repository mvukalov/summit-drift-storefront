"use client";

import { useId, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { QuantityStepper } from "@/components/molecules/QuantityStepper/QuantityStepper";
import { useCart } from "@/components/organisms/CartProvider/CartProvider";
import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/cart/limits";
import type { ProductVariant } from "@/types/catalog";
import styles from "./AddToCart.module.scss";

export interface AddToCartProps {
  /** Whether the selected variant can be bought. */
  available: boolean;
  /**
   * The variant to add, and the data the optimistic line is built from. `null` for a product
   * with no variants at all, which still renders the control in its out-of-stock state rather
   * than dropping it, so the page always says why nothing can be bought.
   */
  variant: ProductVariant | null;
  /** Product title, which is what a cart line is named after. */
  title: string;
}

/**
 * Quantity plus the "Add to cart" button.
 *
 * The optimistic line is built here from data the page already has, so the drawer shows the
 * item before the request finishes. A refusal at the per-line maximum comes back without any
 * request at all and is shown next to this button rather than in the drawer, because this is
 * the control that caused it.
 */
export function AddToCart({ available, variant, title }: AddToCartProps) {
  const { addLine, openDrawer } = useCart();
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const errorId = useId();

  async function handleAddToCart() {
    if (!variant) return;
    setError(null);
    setIsAdding(true);

    const result = await addLine({
      variantId: variant.id,
      title,
      options: variant.selectedOptions,
      image: variant.image,
      quantity,
      unitPrice: variant.price,
    });

    setIsAdding(false);

    if (result.ok) {
      // Opening the drawer moves focus into it, which is also how the user learns the add
      // worked without a separate announcement.
      openDrawer();
    } else {
      setError(result.error ?? null);
    }
  }

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

        <Button
          className={styles.submit}
          disabled={!available}
          loading={isAdding}
          onClick={handleAddToCart}
          aria-describedby={error ? errorId : undefined}
        >
          {available ? "Add to cart" : "Out of stock"}
        </Button>
      </div>

      {/* Tied to the button with aria-describedby, so the reason reaches whoever pressed it. */}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
