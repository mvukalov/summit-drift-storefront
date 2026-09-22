import Link from "next/link";
import { buttonClassName } from "@/components/atoms/Button/Button";
import { ProductImage } from "@/components/atoms/ProductImage/ProductImage";
import { ProductCard } from "@/components/molecules/ProductCard/ProductCard";
import { getCollections, getFeaturedProducts } from "@/lib/catalog/fetchers";
import styles from "./page.module.scss";

// Pinned by handle rather than "first collection", so the hero doesn't depend on API order.
const HERO_COLLECTION_HANDLE = "summit-protection-shells";

// Rendered widths per layout in page.module.scss: the hero image is a quarter column from md
// (full width, capped, below); both grids go from 2 to 4 columns at md.
const HERO_IMAGE_SIZES = "(min-width: 768px) 25vw, 20rem";
const GRID_IMAGE_SIZES = "(min-width: 768px) 25vw, 50vw";

export default async function Home() {
  const [collections, featuredProducts] = await Promise.all([
    getCollections(),
    getFeaturedProducts(),
  ]);
  const heroCollection = collections.find(
    (collection) => collection.handle === HERO_COLLECTION_HANDLE,
  );

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Expedition series</p>
          <h1 id="hero-heading">Built for the long climb, worn past the summit.</h1>
          <p className={styles.lede}>
            Layered shells and technical field gear cut for movement, difficult forecasts, and the
            miles still ahead.
          </p>
          <div className={styles.ctas}>
            <Link href="#collections" className={buttonClassName("primary")}>
              Shop the collection
            </Link>
            <Link href="#featured" className={buttonClassName("secondary")}>
              Shop sale
            </Link>
          </div>
        </div>
        {heroCollection?.image && (
          <div className={styles.heroMedia}>
            <ProductImage
              image={heroCollection.image}
              title={heroCollection.title}
              sizes={HERO_IMAGE_SIZES}
              isLcp
            />
          </div>
        )}
      </section>

      <section id="collections" className={styles.section} aria-labelledby="collections-heading">
        <h2 id="collections-heading" className={styles.sectionHeading}>
          Collections
        </h2>
        <ul className={styles.grid}>
          {collections.map((collection) => (
            <li key={collection.handle} className={styles.tile}>
              <ProductImage
                image={collection.image}
                title={collection.title}
                sizes={GRID_IMAGE_SIZES}
                decorative
              />
              <h3 className={styles.tileTitle}>
                {/* Stretched over the tile, like ProductCard's title link. */}
                <Link href={`/collections/${collection.handle}`} className={styles.tileLink}>
                  {collection.title}
                </Link>
              </h3>
            </li>
          ))}
        </ul>
      </section>

      <section id="featured" className={styles.section} aria-labelledby="featured-heading">
        <h2 id="featured-heading" className={styles.sectionHeading}>
          Featured
        </h2>
        <ul className={styles.grid}>
          {featuredProducts.map((product) => (
            <li key={product.handle}>
              <ProductCard product={product} sizes={GRID_IMAGE_SIZES} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
