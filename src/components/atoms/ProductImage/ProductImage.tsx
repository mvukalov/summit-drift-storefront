import Image from "next/image";
import type { Image as ImageData } from "@/types/catalog";
import styles from "./ProductImage.module.scss";

export interface ProductImageProps {
  /** `null` renders the placeholder frame only, so the layout never shifts. */
  image: ImageData | null;
  /** Alt text fallback when the API has no `altText` (collection images have none). */
  title: string;
  /** Required: without it the browser assumes 100vw and downloads oversized images. */
  sizes: string;
  /** The page's single LCP image. Every other image is still eager (see coding standards). */
  isLcp?: boolean;
  /**
   * Empty alt text, for images whose name is already visible right next to them
   * (e.g. a collection tile's title), so screen readers don't read it twice.
   */
  decorative?: boolean;
}

// Always `fill` in a 4:7 frame: collection images report null dimensions, and a fixed
// frame gives every grid the same crop and reserves space before the image loads.
export function ProductImage({
  image,
  title,
  sizes,
  isLcp = false,
  decorative = false,
}: ProductImageProps) {
  return (
    <div className={styles.frame}>
      {image && (
        <Image
          src={image.url}
          alt={decorative ? "" : image.altText?.trim() || title}
          fill
          sizes={sizes}
          loading="eager"
          fetchPriority={isLcp ? "high" : undefined}
          className={styles.image}
        />
      )}
    </div>
  );
}
