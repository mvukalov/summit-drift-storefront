import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName } from "@/components/atoms/Button/Button";
import { JsonLd } from "@/components/atoms/JsonLd/JsonLd";
import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import { ProductCard } from "@/components/molecules/ProductCard/ProductCard";
import { FilterSidebar } from "@/components/organisms/FilterSidebar/FilterSidebar";
import { getCollection } from "@/lib/catalog/fetchers";
import { applyFacets } from "@/lib/facets/apply";
import { buildFacetsView } from "@/lib/facets/counts";
import { deriveFacets } from "@/lib/facets/derive";
import { clearFacets, collectionHref } from "@/lib/facets/query";
import { parseSortParam } from "@/lib/facets/sort";
import { parseFacetsParam } from "@/lib/facets/url";
import { buildBreadcrumbList } from "@/lib/seo/breadcrumbs";
import { CollectionToolbar } from "./CollectionToolbar";
import styles from "./page.module.scss";

// 2 → 4 columns, narrowing again at lg where the filter sidebar takes a column of the
// layout. Keep in sync with .grid and .layout.
const GRID_IMAGE_SIZES = "(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw";

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
      // Sort and facets vary the URL but not the content's identity, so every variant
      // points at the clean collection URL — no query string (§5.5).
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
  const basePath = collectionPath(handle);

  // The API ignores `filters:` (§5.1), so the whole collection is fetched already sorted by
  // `sortKey`/`reverse` and filtered here. `applyFacets` preserves order, so the grid stays
  // in the order the API returned: sort first, then filter, and the two never fight.
  const facets = deriveFacets(products);
  const selected = parseFacetsParam(searchParams, facets);
  const visible = applyFacets(products, selected);
  const view = buildFacetsView(products, facets, selected);

  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", path: "/" },
    { name: collection.title, path: basePath },
  ]);

  const isEmptyCollection = products.length === 0;

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <div className={styles.page}>
        <header className={styles.header}>
          <h1>{collection.title}</h1>
          {collection.description && <p className={styles.description}>{collection.description}</p>}
        </header>

        {isEmptyCollection ? (
          <p className={styles.empty}>
            There are no products in this collection right now. Please check back soon.
          </p>
        ) : (
          <div className={styles.layout}>
            <FilterSidebar view={view} selected={selected} basePath={basePath} sort={sort} />

            <div className={styles.main}>
              <CollectionToolbar
                view={view}
                selected={selected}
                sort={sort}
                basePath={basePath}
                resultCount={visible.length}
              />

              <section aria-labelledby="products-heading">
                {/* The cards are h3; without this h2 the page would jump h1 → h3. */}
                <VisuallyHidden>
                  <h2 id="products-heading">Products</h2>
                </VisuallyHidden>

                {visible.length === 0 ? (
                  // Distinct from the empty-collection message above: the collection has
                  // products, this particular combination of filters has none.
                  <div className={styles.noResults}>
                    <p>No products match these filters.</p>
                    <Link
                      href={collectionHref(basePath, clearFacets(), sort)}
                      className={buttonClassName("secondary")}
                    >
                      Clear all filters
                    </Link>
                  </div>
                ) : (
                  <ul className={styles.grid}>
                    {visible.map((product) => (
                      <li key={product.handle}>
                        <ProductCard product={product} sizes={GRID_IMAGE_SIZES} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
