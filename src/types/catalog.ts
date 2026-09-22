import type {
  CollectionSummaryFragment,
  ImageFragment,
  MoneyFragment,
  ProductCardFragment,
} from "@/lib/graphql/generated/graphql";

// Domain types derived from the generated GraphQL types.
// Components use these, never the generated types directly.

export type Money = MoneyFragment;

export type Image = ImageFragment;

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
