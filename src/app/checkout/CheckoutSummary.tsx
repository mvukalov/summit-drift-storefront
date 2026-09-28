"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button, buttonClassName } from "@/components/atoms/Button/Button";
import { Price } from "@/components/atoms/Price/Price";
import { CartLineSummary } from "@/components/molecules/CartLineSummary/CartLineSummary";
import { useCart } from "@/components/organisms/CartProvider/CartProvider";
import { GENERIC_ERROR } from "@/lib/cart/messages";
import styles from "./CheckoutSummary.module.scss";

/**
 * The checkout's summary, "Place order" button and confirmation.
 *
 * The confirmation is optimistic in the same sense as the cart (§5.3): it replaces the summary
 * on click, then the cart is emptied, and a failed clear rolls back to the summary with a
 * message. Showing it first also means the emptied cart can never flash the empty state.
 */
export function CheckoutSummary() {
  const { cart, clearCart } = useCart();
  const [isPlaced, setIsPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();

  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const placeOrderRef = useRef<HTMLButtonElement>(null);

  async function handlePlaceOrder() {
    setError(null);
    setIsPlaced(true);

    const result = await clearCart();
    if (!result.ok) {
      setIsPlaced(false);
      setError(result.error ?? GENERIC_ERROR);
    }
  }

  // The clicked button unmounts either way, which would drop focus to <body>. Focus follows
  // the content that replaced it: the confirmation, or the button again after a rollback.
  useEffect(() => {
    if (isPlaced) confirmationRef.current?.focus();
    else if (error) placeOrderRef.current?.focus();
  }, [isPlaced, error]);

  if (isPlaced) {
    return (
      <section className={styles.checkout} aria-labelledby={headingId}>
        {/* tabIndex -1: not tabbable, only the target focus moves to after placing the order. */}
        <h2 id={headingId} ref={confirmationRef} tabIndex={-1} className={styles.heading}>
          Order placed
        </h2>
        <p className={styles.message}>
          Thanks for trying the Summit Drift demo store. No payment was taken and nothing will ship.
        </p>
        <Link href="/" className={buttonClassName("secondary")}>
          Continue shopping
        </Link>
      </section>
    );
  }

  // Same copy and call to action as the drawer's empty state.
  if (cart.lines.length === 0) {
    return (
      <div className={styles.checkout}>
        <p className={styles.message}>Your cart is empty.</p>
        <Link href="/" className={buttonClassName("secondary")}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.checkout} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Order summary
      </h2>

      <ul className={styles.lines}>
        {cart.lines.map((line) => (
          <li key={line.id} className={styles.line}>
            <CartLineSummary line={line} showQuantity />
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <p className={styles.total}>
          <span>Total</span>
          <Price price={cart.subtotal} />
        </p>
        <p className={styles.note}>This is a demo store: no payment is taken and nothing ships.</p>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button ref={placeOrderRef} className={styles.placeOrder} onClick={handlePlaceOrder}>
        Place order
      </Button>
    </section>
  );
}
