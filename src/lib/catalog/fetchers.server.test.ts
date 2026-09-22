import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CollectionByHandleDocument, CollectionsDocument } from "@/lib/graphql/generated/graphql";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { server } from "@/test/msw/server";
import { shop } from "@/test/msw/handlers";
import { getCollection, getCollections } from "./fetchers";

describe("getCollections", () => {
  it("returns every collection as a CollectionSummary", async () => {
    const collections = await getCollections();

    expect(collections.map((collection) => collection.handle)).toEqual([
      "summit-protection-shells",
      "trail-foundation-layers",
      "rugged-traverse-bottoms",
      "expedition-field-gear",
    ]);
  });

  it("rejects on GraphQL errors instead of returning an empty list", async () => {
    server.use(
      shop.query(CollectionsDocument, () =>
        HttpResponse.json({
          errors: [
            { message: "Field 'nope' doesn't exist", extensions: { code: "undefinedField" } },
          ],
        }),
      ),
    );

    await expect(getCollections()).rejects.toThrow("Field 'nope' doesn't exist");
  });

  it("rejects on network errors", async () => {
    server.use(shop.query(CollectionsDocument, () => HttpResponse.error()));

    await expect(getCollections()).rejects.toThrow();
  });
});

describe("getCollection", () => {
  it("returns the collection and its products as domain types", async () => {
    const result = await getCollection("summit-protection-shells");

    expect(result?.collection.title).toBe("Summit Protection Shells");
    expect(result?.products).toHaveLength(8);
    expect(result?.products.filter((product) => product.isOnSale)).toHaveLength(3);
  });

  it("returns an empty product list for an empty collection", async () => {
    const { collection } = collectionByHandleFixture;
    server.use(
      shop.query(CollectionByHandleDocument, () =>
        HttpResponse.json({
          data: { collection: { ...collection, products: { ...collection.products, nodes: [] } } },
        }),
      ),
    );

    const result = await getCollection(collection.handle);

    expect(result?.collection.handle).toBe(collection.handle);
    expect(result?.products).toEqual([]);
  });

  it("returns null for an unknown handle", async () => {
    await expect(getCollection("does-not-exist")).resolves.toBeNull();
  });

  it("rejects on GraphQL errors instead of returning null", async () => {
    server.use(
      shop.query(CollectionByHandleDocument, () =>
        HttpResponse.json({ errors: [{ message: "Internal error" }] }),
      ),
    );

    await expect(getCollection("summit-protection-shells")).rejects.toThrow("Internal error");
  });

  it("rejects on network errors", async () => {
    server.use(shop.query(CollectionByHandleDocument, () => HttpResponse.error()));

    await expect(getCollection("summit-protection-shells")).rejects.toThrow();
  });
});
