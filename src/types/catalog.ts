import type {
  CollectionSummaryFragment,
  ImageFragment,
  MoneyFragment,
  ProductCardFragment,
} from "@/lib/graphql/generated/graphql";

// Domain types derived from the generated GraphQL types, without GraphQL's `__typename`.
// Components use these, never the generated types directly.

export type Money = Omit<MoneyFragment, "__typename">;

export type Image = Omit<ImageFragment, "__typename">;

export type CollectionSummary = Pick<
  CollectionSummaryFragment,
  "handle" | "title" | "description"
> & {
  image: Image | null;
};

// The option axes a product offers (`color`, `size`, `material`, `finish`), as the API
// names them: lowercase, with inconsistent value casing. Facets are derived from these.
export type ProductOption = Omit<ProductCardFragment["options"][number], "__typename">;

export type ProductCard = Pick<ProductCardFragment, "handle" | "title"> & {
  options: ProductOption[];
  image: Image | null;
  price: Money;
  compareAtPrice: Money | null;
  isOnSale: boolean;
};
