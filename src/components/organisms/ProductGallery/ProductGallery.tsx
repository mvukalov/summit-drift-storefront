"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState } from "react";
import type { Image as ImageData } from "@/types/catalog";
import styles from "./ProductGallery.module.scss";

export interface ProductGalleryProps {
  images: ImageData[];
  /** Alt-text fallback for images the API left without `altText`. */
  title: string;
  /** Shown first when it is one of `images`, so the gallery follows the selected variant. */
  activeImageUrl?: string | null;
}

// The catalog's product images are 768×1344 (project overview §2). Unlike the grid, the PDP
// knows the slot it renders into, so `next/image` gets intrinsic width/height rather than
// `fill`: the aspect ratio is reserved from the numbers themselves and CSS controls the
// rendered size. These are the fallback when the API omits the dimensions.
const NATIVE_WIDTH = 768;
const NATIVE_HEIGHT = 1344;

// One column on mobile, roughly half the viewport once the PDP splits into two columns.
const MAIN_SIZES = "(min-width: 768px) 50vw, 100vw";
const THUMB_SIZES = "72px"; // matches --size-thumb

function altFor(image: ImageData, title: string): string {
  return image.altText?.trim() || title;
}

/**
 * The product's images: one large image with thumbnails beneath it.
 *
 * Which image is shown is local state on purpose. It is a view preference, not part of the
 * product's identity the way the variant is, so it does not belong in the URL — but when
 * the selected variant carries its own image, that image wins and the gallery follows it.
 */
export function ProductGallery({ images, title, activeImageUrl }: ProductGalleryProps) {
  const [chosenUrl, setChosenUrl] = useState<string | null>(null);

  // The variant's image takes precedence over a thumbnail the shopper picked earlier, so
  // switching colour never leaves the previous colour's photo on screen. Every variant in
  // this catalog reports the product's featured image, so this is exercised by tests
  // rather than by real data (verified across all 30 products, 2026-09-23).
  const active =
    images.find((image) => image.url === chosenUrl) ??
    images.find((image) => image.url === activeImageUrl) ??
    images[0];

  if (!active) {
    // A product with no images still renders a page; the frame reserves its space.
    return <div className={clsx(styles.frame, styles.empty)} />;
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.frame}>
        <Image
          src={active.url}
          alt={altFor(active, title)}
          width={active.width ?? NATIVE_WIDTH}
          height={active.height ?? NATIVE_HEIGHT}
          sizes={MAIN_SIZES}
          // The PDP's LCP element. `priority` is deprecated in Next 16; the standards pair
          // eager loading with a high fetch priority on exactly one image per page.
          loading="eager"
          fetchPriority="high"
          className={styles.image}
        />
      </div>

      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((image) => {
            const isActive = image.url === active.url;

            return (
              <li key={image.url}>
                <button
                  type="button"
                  className={clsx(styles.thumb, isActive && styles.thumbActive)}
                  aria-label={`Show image: ${altFor(image, title)}`}
                  aria-current={isActive || undefined}
                  onClick={() => setChosenUrl(image.url)}
                >
                  <Image
                    src={image.url}
                    alt=""
                    width={image.width ?? NATIVE_WIDTH}
                    height={image.height ?? NATIVE_HEIGHT}
                    sizes={THUMB_SIZES}
                    // Lazy: at 72px these are secondary to the LCP image, and loading them
                    // eagerly made the browser preload a candidate it never used.
                    loading="lazy"
                    className={styles.thumbImage}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
