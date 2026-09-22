import { graphql, HttpResponse } from "msw";
import {
  CollectionByHandleDocument,
  CollectionsDocument,
  FeaturedProductsDocument,
  MainMenuDocument,
} from "@/lib/graphql/generated/graphql";
import { SHOPIFY_API_URL } from "@/lib/graphql/config";
import { collectionByHandleFixture, unknownCollectionFixture } from "./fixtures/collectionByHandle";
import { collectionsFixture } from "./fixtures/collections";
import { featuredProductsFixture } from "./fixtures/featuredProducts";
import { mainMenuFixture } from "./fixtures/mainMenu";

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
  shop.query(MainMenuDocument, () => HttpResponse.json({ data: mainMenuFixture })),
];
