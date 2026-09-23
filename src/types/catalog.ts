import type {
  CollectionSummaryFragment,
  ImageFragment,
  MoneyFragment,
  ProductCardFragment,
  ProductVariantFragment,
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

/** One axis of a variant's identity, as the API reports it: `{ name: "color", value: "moss" }`. */
export type SelectedOption = Omit<ProductVariantFragment["selectedOptions"][number], "__typename">;

export type ProductVariant = Pick<
  ProductVariantFragment,
  "id" | "title" | "sku" | "availableForSale"
> & {
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice: Money | null;
  image: Image | null;
};

/**
 * A product page's data.
 *
 * Not an extension of `ProductCard`: the card shows a "from" price derived from the
 * collection's price range, while the PDP's price comes from the selected variant, so the
 * two carry different money fields and the detail type does not fetch the range at all.
 *
 * `descriptionHtml` is the **raw** API value. It is sanitized where it is rendered, by the
 * `RichText` atom, which is the single choke point (docs/html-sanitization.md, decision 3).
 */
export interface ProductDetail {
  handle: string;
  title: string;
  /** Brand, for the Product JSON-LD. */
  vendor: string;
  /** Plain text, for metadata and JSON-LD. */
  description: string;
  /** Raw HTML; sanitized by `RichText` at render time, never by the caller. */
  descriptionHtml: string;
  options: ProductOption[];
  images: Image[];
  variants: ProductVariant[];
}
