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

export type ProductCard = Pick<ProductCardFragment, "handle" | "title"> & {
  image: Image | null;
  price: Money;
  compareAtPrice: Money | null;
  isOnSale: boolean;
};
