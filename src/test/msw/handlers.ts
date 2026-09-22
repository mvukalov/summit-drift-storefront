import { graphql, HttpResponse } from "msw";
import { CollectionByHandleDocument, CollectionsDocument } from "@/lib/graphql/generated/graphql";
import { SHOPIFY_API_URL } from "@/lib/graphql/config";
import { collectionByHandleFixture, unknownCollectionFixture } from "./fixtures/collectionByHandle";
import { collectionsFixture } from "./fixtures/collections";

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
];
