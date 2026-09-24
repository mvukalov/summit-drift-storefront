"use client";

import { Button } from "@/components/atoms/Button/Button";
import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import { useCart } from "../CartProvider/CartProvider";
import { CartIcon } from "./icons";
import styles from "./CartTrigger.module.scss";

function itemLabel(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

/**
 * The header's cart button and item count.
 *
 * A client component, but the count is still correct in the server-rendered HTML: it comes
 * from `CartProvider`'s initial state, which the layout read from the same httpOnly cookie.
 * The first client render therefore agrees with the markup and nothing flickers from 0 to N.
 */
export function CartTrigger() {
  const { cart, triggerProps } = useCart();
  const count = cart.totalQuantity;

  return (
    <>
      <Button
        {...triggerProps}
        variant="ghost"
        className={styles.trigger}
        aria-label={`Cart, ${itemLabel(count)}`}
      >
        <CartIcon />
        {/* Announced through the button's own label, so the badge itself is decorative. */}
        {count > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {count}
          </span>
        )}
      </Button>

      {/* Announces later changes without moving focus. Kept out of the button so updating it
          never rewrites the accessible name of the control the user may be sitting on. */}
      <VisuallyHidden>
        <span role="status">{itemLabel(count)} in your cart</span>
      </VisuallyHidden>
    </>
  );
}
