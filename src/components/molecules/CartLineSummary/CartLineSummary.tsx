import { Price } from "@/components/atoms/Price/Price";
import { ProductImage } from "@/components/atoms/ProductImage/ProductImage";
import { formatMoney } from "@/lib/format/money";
import { formatOptionValue } from "@/lib/format/options";
import type { CartLine } from "@/types/cart";
import styles from "./CartLineSummary.module.scss";

// The thumbnail is a fixed 4rem column, so one descriptor covers every breakpoint.
const THUMBNAIL_SIZES = "4rem";

export interface CartLineSummaryProps {
  line: CartLine;
  /**
   * Spells out the quantity and unit price, for read-only views (the checkout summary). The
   * drawer leaves it off: its stepper already shows the quantity.
   */
  showQuantity?: boolean;
}

/** One cart line as a thumbnail, title, options and line total. Controls are the caller's. */
export function CartLineSummary({ line, showQuantity = false }: CartLineSummaryProps) {
  const description = line.options.map((option) => formatOptionValue(option.value)).join(" / ");

  return (
    <div className={styles.summary}>
      <div className={styles.thumbnail}>
        <ProductImage image={line.image} title={line.title} sizes={THUMBNAIL_SIZES} decorative />
      </div>

      <div className={styles.details}>
        <p className={styles.title}>{line.title}</p>
        {description && <p className={styles.options}>{description}</p>}
        {showQuantity && (
          // Plain text rather than the Price atom: this sits inside a sentence, and the atom's
          // display size would outweigh the line total below it.
          <p className={styles.options}>
            Quantity {line.quantity}, {formatMoney(line.unitPrice)} each
          </p>
        )}
        <div className={styles.lineTotal}>
          <Price price={line.lineTotal} />
        </div>
      </div>
    </div>
  );
}
