import type {
  CollectionSummaryFragment,
  ProductCardFragment,
} from "@/lib/graphql/generated/graphql";
import type { CollectionSummary, Money, ProductCard } from "@/types/catalog";

function isGreater(a: Money, b: Money): boolean {
  return Number(a.amount) > Number(b.amount);
}

export function toCollectionSummary(collection: CollectionSummaryFragment): CollectionSummary {
  return {
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    image: collection.image ?? null,
  };
}

// The card shows the lowest variant price ("from" price).
// A product is on sale when any variant's compare-at price is above its price;
// variants without a compare-at price report 0.0, so the range max captures that.
// The struck-through price pairs with the lowest price when it is itself a sale price,
// otherwise the highest compare-at price is shown.
export function toProductCard(product: ProductCardFragment): ProductCard {
  const price = product.priceRange.minVariantPrice;
  const { minVariantPrice: minCompareAt, maxVariantPrice: maxCompareAt } =
    product.compareAtPriceRange;
  const isOnSale = isGreater(maxCompareAt, price);

  let compareAtPrice: Money | null = null;
  if (isOnSale) {
    compareAtPrice = isGreater(minCompareAt, price) ? minCompareAt : maxCompareAt;
  }

  return {
    handle: product.handle,
    title: product.title,
    image: product.featuredImage ?? null,
    price,
    compareAtPrice,
    isOnSale,
  };
}
