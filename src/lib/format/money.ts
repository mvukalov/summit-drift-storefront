import type { Money } from "@/types/catalog";

// The store has a single market and language (project-overview §2). A fixed locale keeps
// server and client output identical, so formatted prices never cause a hydration mismatch.
const LOCALE = "en-US";

/** Formats a money value in its own currency, e.g. `{ amount: "249.0", currencyCode: "USD" }` → `$249.00`. */
export function formatMoney(money: Money): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: money.currencyCode,
  }).format(Number(money.amount));
}

/**
 * The numeric value of a money amount, or `null` when it is not a usable number.
 *
 * `Number("")` is `0`, which would quietly put an unpriced product at the bottom of a price
 * facet, so a blank amount is rejected rather than treated as free.
 */
export function toAmount(money: Money): number | null {
  if (money.amount.trim() === "") return null;
  const amount = Number(money.amount);
  return Number.isFinite(amount) ? amount : null;
}
