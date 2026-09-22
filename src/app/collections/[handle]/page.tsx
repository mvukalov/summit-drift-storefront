import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/atoms/JsonLd/JsonLd";
import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import { ProductCard } from "@/components/molecules/ProductCard/ProductCard";
import { getCollection } from "@/lib/catalog/fetchers";
import { parseSortParam } from "@/lib/facets/sort";
import { buildBreadcrumbList } from "@/lib/seo/breadcrumbs";
import { SortControl } from "./SortControl";
import styles from "./page.module.scss";

// Same 2 → 4 column grid as Home's featured section; keep in sync with .grid.
const GRID_IMAGE_SIZES = "(min-width: 768px) 25vw, 50vw";

function collectionPath(handle: string) {
  return `/collections/${handle}`;
}

export async function generateMetadata(
  props: PageProps<"/collections/[handle]">,
): Promise<Metadata> {
  const { handle } = await props.params;
  const result = await getCollection(handle);

  if (!result) {
    return { title: "Collection not found" };
  }

  return {
    title: result.collection.title,
    description: result.collection.description,
    alternates: {
      // Sort (and later, facets) vary the URL but not the content's identity, so every
      // variant points at the clean collection URL — no query string (§5.5).
      canonical: collectionPath(handle),
    },
  };
}

export default async function CollectionPage(props: PageProps<"/collections/[handle]">) {
  const [{ handle }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const sort = parseSortParam(searchParams.sort);
  const result = await getCollection(handle, sort);

  if (!result) {
    notFound();
  }

  const { collection, products } = result;
  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", path: "/" },
    { name: collection.title, path: collectionPath(handle) },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <div className={styles.page}>
        <header className={styles.header}>
          <h1>{collection.title}</h1>
          {collection.description && <p className={styles.description}>{collection.description}</p>}
        </header>

        <div className={styles.toolbar}>
          <p className={styles.count}>
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
          <SortControl value={sort} basePath={collectionPath(handle)} />
        </div>

        <section aria-labelledby="products-heading">
          {/* The cards are h3; without this h2 the page would jump h1 → h3. */}
          <VisuallyHidden>
            <h2 id="products-heading">Products</h2>
          </VisuallyHidden>
          {products.length === 0 ? (
            <p className={styles.empty}>
              There are no products in this collection right now. Please check back soon.
            </p>
          ) : (
            <ul className={styles.grid}>
              {products.map((product) => (
                <li key={product.handle}>
                  <ProductCard product={product} sizes={GRID_IMAGE_SIZES} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
