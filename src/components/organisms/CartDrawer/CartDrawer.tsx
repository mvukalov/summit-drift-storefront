"use client";

import Link from "next/link";
import { Button, buttonClassName } from "@/components/atoms/Button/Button";
import { Price } from "@/components/atoms/Price/Price";
import { ProductImage } from "@/components/atoms/ProductImage/ProductImage";
import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import { QuantityStepper } from "@/components/molecules/QuantityStepper/QuantityStepper";
import { formatOptionValue } from "@/lib/format/options";
import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/cart/limits";
import { isOptimisticLine } from "@/lib/cart/reducer";
import type { CartLine } from "@/types/cart";
import { useCart } from "../CartProvider/CartProvider";
import { CloseIcon } from "../Header/icons";
import styles from "./CartDrawer.module.scss";

// The thumbnail is a fixed 4rem column, so one descriptor covers every breakpoint.
const THUMBNAIL_SIZES = "4rem";

/**
 * The cart, as a modal `<dialog>`.
 *
 * Third consumer of `useModalDialog` after `MobileNav` and `FilterDrawer`, so the focus trap,
 * Escape handling and focus return are the browser's. The hook lives in `CartProvider`
 * because the button that opens this drawer sits in the header, outside this component.
 */
export function CartDrawer() {
  const { cart, error, dismissError, dialogProps, drawerTitleId, closeDrawer } = useCart();
  const isEmpty = cart.lines.length === 0;

  return (
    <dialog {...dialogProps} className={styles.panel}>
      <div className={styles.content}>
        <div className={styles.top}>
          <h2 id={drawerTitleId} className={styles.title}>
            Your cart
          </h2>
          <Button
            variant="secondary"
            className={styles.close}
            aria-label="Close cart"
            onClick={closeDrawer}
          >
            <CloseIcon />
          </Button>
        </div>

        {/* Errors are text, not colour alone, and sit above the lines they refer to. */}
        {error && (
          <p className={styles.error} role="alert">
            {error}{" "}
            <button type="button" className={styles.dismiss} onClick={dismissError}>
              Dismiss
            </button>
          </p>
        )}

        {isEmpty ? (
          <div className={styles.empty}>
            <p>Your cart is empty.</p>
            <Link href="/" className={buttonClassName("secondary")} onClick={closeDrawer}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.lines}>
              {cart.lines.map((line) => (
                <CartDrawerLine key={line.id} line={line} />
              ))}
            </ul>

            <div className={styles.footer}>
              <p className={styles.subtotal}>
                <span>Subtotal</span>
                <Price price={cart.subtotal} />
              </p>
              {/* Taxes and shipping are not modelled by this API, so no estimate is implied. */}
              <p className={styles.note}>Taxes and shipping calculated at checkout.</p>
              <a href={cart.checkoutUrl} className={buttonClassName("primary", styles.checkout)}>
                Checkout
              </a>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function CartDrawerLine({ line }: { line: CartLine }) {
  const { setLineQuantity, removeLine } = useCart();

  // A line the server hasn't acknowledged yet has no real id, so it cannot be addressed by a
  // mutation. Its controls stay visible but inert for the moment the request is in flight.
  const isPendingLine = isOptimisticLine(line.id);

  const description = line.options.map((option) => formatOptionValue(option.value)).join(" / ");

  return (
    <li className={styles.line}>
      <div className={styles.thumbnail}>
        <ProductImage image={line.image} title={line.title} sizes={THUMBNAIL_SIZES} decorative />
      </div>

      <div className={styles.details}>
        <p className={styles.lineTitle}>{line.title}</p>
        {description && <p className={styles.options}>{description}</p>}
        <div className={styles.lineTotal}>
          <Price price={line.lineTotal} />
        </div>
      </div>

      <div className={styles.controls}>
        <QuantityStepper
          value={line.quantity}
          onChange={(quantity) => setLineQuantity(line.id, quantity)}
          min={MIN_QUANTITY}
          max={MAX_QUANTITY}
          label={`Quantity for ${line.title}`}
          labelHidden
          disabled={isPendingLine}
        />
        <Button
          variant="ghost"
          className={styles.remove}
          onClick={() => removeLine(line.id)}
          disabled={isPendingLine}
        >
          Remove<VisuallyHidden> {line.title}</VisuallyHidden>
        </Button>
      </div>
    </li>
  );
}
