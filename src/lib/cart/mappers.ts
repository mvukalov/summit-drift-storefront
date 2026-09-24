import type {
  CartFragment,
  CartLineFragment,
  CurrencyCode,
  ImageFragment,
  MoneyFragment,
} from "@/lib/graphql/generated/graphql";
import type { Image, Money } from "@/types/catalog";
import type { Cart, CartLine } from "@/types/cart";

// Fields are copied explicitly so GraphQL's `__typename` never reaches domain objects,
// matching `src/lib/catalog/mappers.ts`.

function toMoney(money: MoneyFragment): Money {
  return { amount: money.amount, currencyCode: money.currencyCode };
}

function toImage(image: ImageFragment | null): Image | null {
  if (!image) return null;
  return { url: image.url, altText: image.altText, width: image.width, height: image.height };
}

export function toCartLine(line: CartLineFragment): CartLine {
  const variant = line.merchandise;

  return {
    id: line.id,
    variantId: variant.id,
    title: variant.product.title,
    options: variant.selectedOptions.map((option) => ({
      name: option.name,
      value: option.value,
    })),
    image: toImage(variant.image),
    quantity: line.quantity,
    // `cost.amountPerQuantity` is typed non-null and was equal to `merchandise.price` on all
    // 27 real lines probed on 2026-09-24, so this fallback is unreachable against today's
    // API. It is one expression of insurance against mock data that violates its own schema,
    // which would otherwise crash the drawer on a missing `amount`. Covered by a synthetic
    // test, the same way the product page covered its unreachable out-of-stock state.
    unitPrice: toMoney(line.cost.amountPerQuantity ?? variant.price),
    lineTotal: toMoney(line.cost.totalAmount),
  };
}

export function toCart(cart: CartFragment): Cart {
  return {
    id: cart.id,
    // Returned newest-first; the reducer prepends new lines to match.
    lines: cart.lines.nodes.map(toCartLine),
    subtotal: toMoney(cart.cost.subtotalAmount),
    totalQuantity: cart.totalQuantity,
    checkoutUrl: cart.checkoutUrl,
  };
}

/**
 * The cart shown when there is no cookie, or when the id behind it is dead.
 *
 * A fresh object every call: a shared constant would be one mutable value reachable from
 * every request, which is the `EMPTY_FACETS` leak caught in review on PR #14.
 */
export function emptyCart(currencyCode: CurrencyCode = "USD"): Cart {
  return {
    id: "",
    lines: [],
    subtotal: { amount: "0.0", currencyCode },
    totalQuantity: 0,
    checkoutUrl: "",
  };
}
