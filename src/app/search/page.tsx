import type { Metadata } from "next";
import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import { ProductCard } from "@/components/molecules/ProductCard/ProductCard";
import { getSearchResults } from "@/lib/catalog/fetchers";
import { paginate } from "@/lib/search/paginate";
import { parseSearchParams } from "@/lib/search/parse";
import { SearchPagination } from "./SearchPagination";
import { SearchSortControl } from "./SearchSortControl";
import styles from "./page.module.scss";

// 2 → 4 columns, no sidebar (unlike the collection page). Keep in sync with .grid.
const GRID_IMAGE_SIZES = "(min-width: 768px) 25vw, 50vw";

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const { q } = parseSearchParams(await props.searchParams);

  return {
    title: q ? `Search results for “${q}”` : "Search",
    // §5.5: every query string is its own URL with no canonical identity, so none of them
    // belong in an index. `follow` stays on so crawlers still reach the products.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const { q, sort, page } = parseSearchParams(await props.searchParams);
  const { products, totalCount } = await getSearchResults(q, sort);
  const current = paginate(products, page);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{q ? `Results for “${q}”` : "Search"}</h1>
      </header>

      {!q ? (
        <p className={styles.message}>Type what you&apos;re looking for in the search box.</p>
      ) : totalCount === 0 ? (
        // Matching is substring-only with no typo tolerance (docs/predictive-search.md), so
        // the likeliest fix is the spelling; the copy says so rather than promising more.
        <p className={styles.message}>
          No products match “{q}”. Check the spelling, or try a shorter word.
        </p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <p className={styles.count}>
              {totalCount} {totalCount === 1 ? "result" : "results"}
            </p>
            <SearchSortControl q={q} value={sort} />
          </div>

          <section aria-labelledby="results-heading">
            {/* The cards are h3; without this h2 the page would jump h1 → h3. */}
            <VisuallyHidden>
              <h2 id="results-heading">Results</h2>
            </VisuallyHidden>
            <ul className={styles.grid}>
              {current.items.map((product) => (
                <li key={product.handle}>
                  <ProductCard product={product} sizes={GRID_IMAGE_SIZES} />
                </li>
              ))}
            </ul>
          </section>

          {current.totalPages > 1 && (
            <SearchPagination
              q={q}
              sort={sort}
              page={current.page}
              totalPages={current.totalPages}
            />
          )}
        </>
      )}
    </div>
  );
}
