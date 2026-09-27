import "server-only";
import {
  CollectionByHandleDocument,
  CollectionsDocument,
  FeaturedProductsDocument,
  MainMenuDocument,
  ProductByHandleDocument,
  SearchDocument,
  type SearchQuery,
} from "@/lib/graphql/generated/graphql";
import { query } from "@/lib/graphql/rsc-client";
import { DEFAULT_SORT, toSortVariables, type SortOption } from "@/lib/facets/sort";
import {
  DEFAULT_SEARCH_SORT,
  toSearchSortVariables,
  type SearchSortOption,
} from "@/lib/search/sort";
import type { CollectionSummary, ProductCard, ProductDetail } from "@/types/catalog";
import type { MenuItem } from "@/types/navigation";
import { toCollectionSummary, toMenuItem, toProductCard, toProductDetail } from "./mappers";

// With Apollo's default errorPolicy ("none"), GraphQL and network errors reject
// the query. They propagate to the route's error boundary instead of becoming empty data.

export async function getCollections(): Promise<CollectionSummary[]> {
  const { data } = await query({ query: CollectionsDocument });
  if (!data) {
    throw new Error("Collections query returned no data");
  }
  return data.collections.nodes.map(toCollectionSummary);
}

// Sorting happens on the API (`sortKey`/`reverse`), not on the fetched array, so the
// order is correct for the whole collection and the page stays server-rendered.
export async function getCollection(
  handle: string,
  sort: SortOption = DEFAULT_SORT,
): Promise<{ collection: CollectionSummary; products: ProductCard[] } | null> {
  const { data } = await query({
    query: CollectionByHandleDocument,
    variables: { handle, ...toSortVariables(sort) },
  });
  if (!data) {
    throw new Error("Collection query returned no data");
  }
  // Unknown handle: the API returns `collection: null` without an error.
  if (!data.collection) {
    return null;
  }
  return {
    collection: toCollectionSummary(data.collection),
    products: data.collection.products.nodes.map(toProductCard),
  };
}

// The product and all of its variants in one request, so the variant picker can resolve a
// selection without a round-trip. Unknown handle -> null, for the route to turn into a 404.
export async function getProduct(handle: string): Promise<ProductDetail | null> {
  const { data } = await query({
    query: ProductByHandleDocument,
    variables: { handle },
  });
  if (!data) {
    throw new Error("Product query returned no data");
  }
  // Unknown handle: the API returns `product: null` without an error.
  if (!data.product) {
    return null;
  }
  return toProductDetail(data.product);
}

// One product per collection (`products(first: 1)`, in the API's order). The catalog has no
// "featured" flag, so this keeps Home dynamic without hard-coded handles.
// A collection without products contributes nothing.
export async function getFeaturedProducts(): Promise<ProductCard[]> {
  const { data } = await query({ query: FeaturedProductsDocument });
  if (!data) {
    throw new Error("Featured products query returned no data");
  }
  return data.collections.nodes.flatMap((collection) =>
    collection.products.nodes.map(toProductCard),
  );
}

// `search(first: 250)` returns the whole matching set (the catalog is 30 products total,
// verified 2026-09-27); `/search` paginates the result in JS (`src/lib/search/paginate.ts`)
// rather than following a GraphQL cursor. An empty query short-circuits before any request:
// the API itself answers "" with an empty result anyway, so skipping the call just avoids a
// wasted round trip when someone visits `/search` with no `q`.
const SEARCH_RESULT_LIMIT = 250;

type SearchResultNode = SearchQuery["search"]["edges"][number]["node"];

function isProductResult(
  node: SearchResultNode,
): node is Extract<SearchResultNode, { __typename: "Product" }> {
  return node.__typename === "Product";
}

export async function getSearchResults(
  searchQuery: string,
  sort: SearchSortOption = DEFAULT_SEARCH_SORT,
): Promise<{ products: ProductCard[]; totalCount: number }> {
  if (!searchQuery) {
    return { products: [], totalCount: 0 };
  }

  const { data } = await query({
    query: SearchDocument,
    variables: {
      query: searchQuery,
      first: SEARCH_RESULT_LIMIT,
      ...toSearchSortVariables(sort),
    },
  });
  if (!data) {
    throw new Error("Search query returned no data");
  }

  // `search.edges.node` is a union (`SearchResultItem` = Article | Page | Product, verified
  // 2026-09-27); `types: PRODUCT` means only the `Product` arm ever comes back at runtime, but
  // the type still has to be narrowed before `toProductCard` can accept it.
  const products = data.search.edges
    .map((edge) => edge.node)
    .filter(isProductResult)
    .map(toProductCard);

  return { products, totalCount: data.search.totalCount };
}

// The menu's "Home" entry (type FRONTPAGE) is dropped: the logo already links home.
export async function getMainMenu(): Promise<MenuItem[]> {
  const { data } = await query({ query: MainMenuDocument });
  if (!data) {
    throw new Error("Main menu query returned no data");
  }
  // A missing menu leaves the site usable, just without navigation links.
  if (!data.menu) {
    return [];
  }
  return data.menu.items
    .filter((item) => item.type !== "FRONTPAGE")
    .map(toMenuItem)
    .filter((item) => item !== null);
}
