import type {
  CollectionSummaryFragment,
  ImageFragment,
  MoneyFragment,
  ProductCardFragment,
} from "@/lib/graphql/generated/graphql";
import type { CollectionSummary, Image, Money, ProductCard } from "@/types/catalog";

// Fields are copied explicitly so GraphQL's `__typename` never reaches domain objects.
function toMoney(money: MoneyFragment): Money {
  return { amount: money.amount, currencyCode: money.currencyCode };
}

function toImage(image: ImageFragment | null): Image | null {
  if (!image) return null;
  return { url: image.url, altText: image.altText, width: image.width, height: image.height };
}

function isGreater(a: Money, b: Money): boolean {
  return Number(a.amount) > Number(b.amount);
}

export function toCollectionSummary(collection: CollectionSummaryFragment): CollectionSummary {
  return {
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    image: toImage(collection.image),
  };
}

// The card shows the lowest variant price ("from" price).
// A product is on sale when any variant's compare-at price is above its price;
// variants without a compare-at price report 0.0, so the range max captures that.
// The struck-through price pairs with the lowest price when it is itself a sale price,
// otherwise the highest compare-at price is shown.
export function toProductCard(product: ProductCardFragment): ProductCard {
  const price = toMoney(product.priceRange.minVariantPrice);
  const minCompareAt = toMoney(product.compareAtPriceRange.minVariantPrice);
  const maxCompareAt = toMoney(product.compareAtPriceRange.maxVariantPrice);
  const isOnSale = isGreater(maxCompareAt, price);

  let compareAtPrice: Money | null = null;
  if (isOnSale) {
    compareAtPrice = isGreater(minCompareAt, price) ? minCompareAt : maxCompareAt;
  }

  return {
    handle: product.handle,
    title: product.title,
    image: toImage(product.featuredImage),
    price,
    compareAtPrice,
    isOnSale,
  };
}
