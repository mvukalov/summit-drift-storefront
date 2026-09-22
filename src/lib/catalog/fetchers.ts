import "server-only";
import {
  CollectionByHandleDocument,
  CollectionsDocument,
  MainMenuDocument,
} from "@/lib/graphql/generated/graphql";
import { query } from "@/lib/graphql/rsc-client";
import type { CollectionSummary, ProductCard } from "@/types/catalog";
import type { MenuItem } from "@/types/navigation";
import { toCollectionSummary, toMenuItem, toProductCard } from "./mappers";

// With Apollo's default errorPolicy ("none"), GraphQL and network errors reject
// the query. They propagate to the route's error boundary instead of becoming empty data.

export async function getCollections(): Promise<CollectionSummary[]> {
  const { data } = await query({ query: CollectionsDocument });
  if (!data) {
    throw new Error("Collections query returned no data");
  }
  return data.collections.nodes.map(toCollectionSummary);
}

export async function getCollection(
  handle: string,
): Promise<{ collection: CollectionSummary; products: ProductCard[] } | null> {
  const { data } = await query({ query: CollectionByHandleDocument, variables: { handle } });
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
