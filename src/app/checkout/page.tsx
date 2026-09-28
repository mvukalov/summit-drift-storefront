import type { Metadata } from "next";
import { CheckoutSummary } from "./CheckoutSummary";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Checkout",
  // A per-visitor page with nothing to index; there is no content behind it to follow either.
  robots: { index: false, follow: false },
};

/**
 * A simulated checkout: summary, "Place order", confirmation. No payment and no order.
 *
 * The cart is not read here. The root layout already reads it once per request and seeds
 * `CartProvider` with it, which is where the header count and the drawer get it too, so the
 * summary is server-rendered from that same read and stays in step with the drawer after.
 */
export default function CheckoutPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Checkout</h1>
      <CheckoutSummary />
    </div>
  );
}
