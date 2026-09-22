import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  CollectionByHandleDocument,
  CollectionsDocument,
  FeaturedProductsDocument,
  MainMenuDocument,
} from "@/lib/graphql/generated/graphql";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { featuredProductsFixture } from "@/test/msw/fixtures/featuredProducts";
import { mainMenuFixture } from "@/test/msw/fixtures/mainMenu";
import { server } from "@/test/msw/server";
import { shop } from "@/test/msw/handlers";
import { getCollection, getCollections, getFeaturedProducts, getMainMenu } from "./fetchers";

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

describe("getFeaturedProducts", () => {
  it("returns the first product of each collection as a ProductCard", async () => {
    const products = await getFeaturedProducts();

    expect(products.map((product) => product.handle)).toEqual([
      "waterproof-wading-jacket-with-breathable-shell",
      "performance-technical-tee",
      "jogger-aus-technischer-mikrofaser",
      "topo-lined-canvas-utility-cap",
    ]);
    expect(products.filter((product) => product.isOnSale).map((product) => product.handle)).toEqual(
      ["waterproof-wading-jacket-with-breathable-shell", "performance-technical-tee"],
    );
  });

  it("skips collections without products", async () => {
    const { collections } = featuredProductsFixture;
    server.use(
      shop.query(FeaturedProductsDocument, () =>
        HttpResponse.json({
          data: {
            collections: {
              ...collections,
              nodes: collections.nodes.map((collection, i) =>
                i === 0
                  ? { ...collection, products: { ...collection.products, nodes: [] } }
                  : collection,
              ),
            },
          },
        }),
      ),
    );

    const products = await getFeaturedProducts();

    expect(products).toHaveLength(3);
    expect(products.map((product) => product.handle)).not.toContain(
      "waterproof-wading-jacket-with-breathable-shell",
    );
  });

  it("rejects on GraphQL errors", async () => {
    server.use(
      shop.query(FeaturedProductsDocument, () =>
        HttpResponse.json({ errors: [{ message: "Internal error" }] }),
      ),
    );

    await expect(getFeaturedProducts()).rejects.toThrow("Internal error");
  });

  it("rejects on network errors", async () => {
    server.use(shop.query(FeaturedProductsDocument, () => HttpResponse.error()));

    await expect(getFeaturedProducts()).rejects.toThrow();
  });
});

describe("getMainMenu", () => {
  it("returns the collection links as site-relative menu items, without Home", async () => {
    const items = await getMainMenu();

    expect(items).toEqual([
      { title: "Summit Protection Shells", href: "/collections/summit-protection-shells" },
      { title: "Trail Foundation Layers", href: "/collections/trail-foundation-layers" },
      { title: "Rugged Traverse Bottoms", href: "/collections/rugged-traverse-bottoms" },
      { title: "Expedition Field Gear", href: "/collections/expedition-field-gear" },
    ]);
  });

  it("skips items without a URL", async () => {
    const { menu } = mainMenuFixture;
    server.use(
      shop.query(MainMenuDocument, () =>
        HttpResponse.json({
          data: {
            menu: {
              ...menu,
              items: menu.items.map((item, i) => (i === 1 ? { ...item, url: null } : item)),
            },
          },
        }),
      ),
    );

    const items = await getMainMenu();

    expect(items.map((item) => item.title)).not.toContain("Summit Protection Shells");
    expect(items).toHaveLength(3);
  });

  it("returns an empty list when the menu does not exist", async () => {
    server.use(shop.query(MainMenuDocument, () => HttpResponse.json({ data: { menu: null } })));

    await expect(getMainMenu()).resolves.toEqual([]);
  });

  it("rejects on GraphQL errors", async () => {
    server.use(
      shop.query(MainMenuDocument, () =>
        HttpResponse.json({ errors: [{ message: "Internal error" }] }),
      ),
    );

    await expect(getMainMenu()).rejects.toThrow("Internal error");
  });

  it("rejects on network errors", async () => {
    server.use(shop.query(MainMenuDocument, () => HttpResponse.error()));

    await expect(getMainMenu()).rejects.toThrow();
  });
});
