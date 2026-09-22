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
