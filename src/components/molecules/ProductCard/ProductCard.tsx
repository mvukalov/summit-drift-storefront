import Link from "next/link";
import { Badge } from "@/components/atoms/Badge/Badge";
import { Price } from "@/components/atoms/Price/Price";
import { ProductImage } from "@/components/atoms/ProductImage/ProductImage";
import type { ProductCard as ProductCardData } from "@/types/catalog";
import styles from "./ProductCard.module.scss";

export interface ProductCardProps {
  product: ProductCardData;
  /** Rendered image width per breakpoint; depends on the grid the card sits in. */
  sizes: string;
}

// The title link stretches over the whole card (see .link::after), so the card is one
// large target while the link's accessible name stays just the product title.
export function ProductCard({ product, sizes }: ProductCardProps) {
  const { handle, title, image, price, compareAtPrice, isOnSale } = product;

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <ProductImage image={image} title={title} sizes={sizes} />
        {isOnSale && (
          <span className={styles.badge}>
            <Badge tone="accent">Sale</Badge>
          </span>
        )}
      </div>
      <h3 className={styles.title}>
        <Link href={`/products/${handle}`} className={styles.link}>
          {title}
        </Link>
      </h3>
      <Price price={price} compareAtPrice={compareAtPrice} isOnSale={isOnSale} />
    </article>
  );
}
