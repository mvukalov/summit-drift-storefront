import { graphql, HttpResponse } from "msw";
import {
  CartByIdDocument,
  CartCreateDocument,
  CartLinesAddDocument,
  CartLinesRemoveDocument,
  CartLinesUpdateDocument,
  CollectionByHandleDocument,
  CollectionsDocument,
  FeaturedProductsDocument,
  MainMenuDocument,
  ProductByHandleDocument,
  type CartUserErrorFragment,
} from "@/lib/graphql/generated/graphql";
import { SHOPIFY_API_URL } from "@/lib/graphql/config";
import { cartByIdFixture } from "./fixtures/cart";
import { collectionByHandleFixture, unknownCollectionFixture } from "./fixtures/collectionByHandle";
import { collectionsFixture } from "./fixtures/collections";
import { featuredProductsFixture } from "./fixtures/featuredProducts";
import { mainMenuFixture } from "./fixtures/mainMenu";
import { productByHandleFixture, unknownProductFixture } from "./fixtures/productByHandle";

export const shop = graphql.link(SHOPIFY_API_URL);

export const handlers = [
  shop.query(CollectionsDocument, () => HttpResponse.json({ data: collectionsFixture })),
  shop.query(CollectionByHandleDocument, ({ variables }) =>
    HttpResponse.json({
      data:
        variables.handle === collectionByHandleFixture.collection.handle
          ? collectionByHandleFixture
          : unknownCollectionFixture,
    }),
  ),
  shop.query(FeaturedProductsDocument, () => HttpResponse.json({ data: featuredProductsFixture })),
  shop.query(ProductByHandleDocument, ({ variables }) =>
    HttpResponse.json({
      data:
        variables.handle === productByHandleFixture.product.handle
          ? productByHandleFixture
          : unknownProductFixture,
    }),
  ),
  shop.query(MainMenuDocument, () => HttpResponse.json({ data: mainMenuFixture })),

  // Cart. These are the happy paths, all answering with the same captured cart; tests that
  // care about a specific outcome override them with `server.use`.
  shop.query(CartByIdDocument, () => HttpResponse.json({ data: cartByIdFixture })),
  shop.mutation(CartCreateDocument, () =>
    HttpResponse.json({ data: { cartCreate: cartPayload("CartCreatePayload") } }),
  ),
  shop.mutation(CartLinesAddDocument, () =>
    HttpResponse.json({ data: { cartLinesAdd: cartPayload("CartLinesAddPayload") } }),
  ),
  shop.mutation(CartLinesUpdateDocument, () =>
    HttpResponse.json({ data: { cartLinesUpdate: cartPayload("CartLinesUpdatePayload") } }),
  ),
  shop.mutation(CartLinesRemoveDocument, () =>
    HttpResponse.json({ data: { cartLinesRemove: cartPayload("CartLinesRemovePayload") } }),
  ),
];

/** The `{ cart, userErrors }` shape every cart mutation returns, under its own payload type. */
export function cartPayload<TTypename extends string>(
  __typename: TTypename,
  userErrors: CartUserErrorFragment[] = [],
) {
  return { __typename, cart: cartByIdFixture.cart, userErrors };
}
