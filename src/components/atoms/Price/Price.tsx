import clsx from "clsx";
import { formatMoney } from "@/lib/format/money";
import type { Money } from "@/types/catalog";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden";
import styles from "./Price.module.scss";

// The price slice of the ProductCard domain type, so a card can spread its product in.
export interface PriceProps {
  price: Money;
  compareAtPrice?: Money | null;
  isOnSale?: boolean;
}

export function Price({ price, compareAtPrice, isOnSale = false }: PriceProps) {
  const originalPrice = isOnSale ? compareAtPrice : null;

  return (
    <span className={styles.price}>
      <span className={clsx(styles.current, originalPrice && styles.sale)}>
        {formatMoney(price)}
      </span>
      {originalPrice && (
        <del className={styles.compareAt}>
          <VisuallyHidden>Original price: </VisuallyHidden>
          {formatMoney(originalPrice)}
        </del>
      )}
    </span>
  );
}
