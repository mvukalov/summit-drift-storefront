"use client";

import { useId, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { QuantityStepper } from "@/components/molecules/QuantityStepper/QuantityStepper";
import { useCart } from "@/components/organisms/CartProvider/CartProvider";
import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/cart/limits";
import type { ProductVariant } from "@/types/catalog";
import styles from "./AddToCart.module.scss";

/**
 * A shown refusal, plus what it was about when it was created.
 *
 * A message is only ever true of one fact: "this variant already has N in the cart." If the
 * shopper then picks a different variant, or this same line changes elsewhere (removed or
 * edited in the drawer), the fact it was about no longer holds. Comparing the *current*
 * variant/quantity against the snapshot taken when the message was created — rather than
 * reactively clearing on every change — means the message never disappears out from under
 * itself the moment it's set: the snapshot is the quantity as of the click that produced it
 * (`handleAddToCart` closes over that render's already-computed `cartQuantity`), not a value
 * re-read later after the optimistic add has come and gone — reading it after the fact would
 * race the very rollback that follows a refusal.
 */
interface AddToCartError {
  message: string;
  variantId: string | undefined;
  cartQuantityAtTimeOfError: number;
}

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
  const { cart, addLine, openDrawer } = useCart();
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [error, setError] = useState<AddToCartError | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const errorId = useId();

  const cartQuantity = variant
    ? (cart.lines.find((line) => line.variantId === variant.id)?.quantity ?? 0)
    : 0;
  // Not shown once either half of what it was about has changed — see AddToCartError.
  const isErrorStale =
    error !== null &&
    (error.variantId !== variant?.id || error.cartQuantityAtTimeOfError !== cartQuantity);
  const visibleError = isErrorStale ? null : error;

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
    } else if (result.error) {
      // `cartQuantity`, not a value re-read after the await: it's this render's — i.e. this
      // click's — number, which for the client-side refusal path is exactly what refused it.
      setError({
        message: result.error,
        variantId: variant.id,
        cartQuantityAtTimeOfError: cartQuantity,
      });
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
          aria-describedby={visibleError ? errorId : undefined}
        >
          {available ? "Add to cart" : "Out of stock"}
        </Button>
      </div>

      {/* Tied to the button with aria-describedby, so the reason reaches whoever pressed it. */}
      {visibleError && (
        <p id={errorId} className={styles.error} role="alert">
          {visibleError.message}
        </p>
      )}
    </div>
  );
}
