"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
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
  const { cart, error, dismissError, removeLine, dialogProps, drawerTitleId, closeDrawer } =
    useCart();
  const isEmpty = cart.lines.length === 0;

  const titleRef = useRef<HTMLHeadingElement>(null);
  // Line id -> its Remove button, so focus can be moved there after a different line is
  // removed. Cleared and repopulated as lines mount/unmount; see the callback ref below.
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  // Set synchronously by handleRemove, before the optimistic removal has rendered. Read and
  // cleared by the effect below once it has: "title" for the empty-cart case, a line id to
  // focus that line's Remove button, or null when there is nothing pending.
  const pendingFocus = useRef<string | "title" | null>(null);

  function handleRemove(index: number, lineId: string) {
    // The neighbour that will end up in the removed line's place, or the one before it if
    // the removed line was last; "title" when it was the only line left.
    const neighbour = cart.lines[index + 1] ?? cart.lines[index - 1];
    pendingFocus.current = neighbour ? neighbour.id : "title";
    removeLine(lineId);
  }

  // Removing a line takes its DOM node with it; left alone, the browser drops focus to
  // <body>. This runs once the optimistic removal has rendered (cart.lines already reflects
  // it) and moves focus somewhere a keyboard/screen-reader user can keep acting from.
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;

    if (target === "title") {
      titleRef.current?.focus();
    } else {
      removeButtons.current.get(target)?.focus();
    }
  }, [cart.lines]);

  return (
    <dialog {...dialogProps} className={styles.panel}>
      <div className={styles.content}>
        <div className={styles.top}>
          {/* tabIndex -1: not normally tabbable, only a focus target after emptying the cart. */}
          <h2 id={drawerTitleId} ref={titleRef} tabIndex={-1} className={styles.title}>
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
              {cart.lines.map((line, index) => (
                <CartDrawerLine
                  key={line.id}
                  line={line}
                  onRemove={() => handleRemove(index, line.id)}
                  removeButtonRef={(el) => {
                    if (el) removeButtons.current.set(line.id, el);
                    else removeButtons.current.delete(line.id);
                  }}
                />
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

interface CartDrawerLineProps {
  line: CartLine;
  /** Removes this line and hands focus-management the index it removed. */
  onRemove: () => void;
  removeButtonRef: (el: HTMLButtonElement | null) => void;
}

function CartDrawerLine({ line, onRemove, removeButtonRef }: CartDrawerLineProps) {
  const { setLineQuantity } = useCart();

  // A line the server hasn't acknowledged yet has no real id, so it cannot be addressed by a
  // mutation. Its controls stay visible but inert for the moment the request is in flight.
  const isPendingLine = isOptimisticLine(line.id);
  const isAtMax = line.quantity >= MAX_QUANTITY;

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
          ref={removeButtonRef}
          variant="ghost"
          className={styles.remove}
          onClick={onRemove}
          disabled={isPendingLine}
        >
          Remove<VisuallyHidden> {line.title}</VisuallyHidden>
        </Button>

        {/* The stepper's "+" is already disabled at the ceiling; this is the text that
            explains why, for a screen-reader user who'd otherwise only hear "dimmed". */}
        {isAtMax && (
          <p className={styles.maxHint} role="status">
            Maximum quantity reached.
          </p>
        )}
      </div>
    </li>
  );
}
