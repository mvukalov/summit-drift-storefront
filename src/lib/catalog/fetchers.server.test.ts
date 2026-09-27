import { InMemoryCache } from "@apollo/client";
import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  CollectionByHandleDocument,
  CollectionsDocument,
  FeaturedProductsDocument,
  MainMenuDocument,
  ProductByHandleDocument,
  SearchDocument,
} from "@/lib/graphql/generated/graphql";
import { POSSIBLE_TYPES } from "@/lib/graphql/config";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { featuredProductsFixture } from "@/test/msw/fixtures/featuredProducts";
import { mainMenuFixture } from "@/test/msw/fixtures/mainMenu";
import { emptySearchFixture, searchFixture } from "@/test/msw/fixtures/search";
import { server } from "@/test/msw/server";
import { shop } from "@/test/msw/handlers";
import {
  getCollection,
  getCollections,
  getFeaturedProducts,
  getMainMenu,
  getProduct,
  getSearchResults,
} from "./fetchers";

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

  // Sorting is the API's job (sortKey/reverse), not a client-side re-sort of the fetched
  // array, so what matters is which variables leave the client.
  describe("sort variables", () => {
    function captureVariables() {
      const sent: Record<string, unknown>[] = [];
      server.use(
        shop.query(CollectionByHandleDocument, ({ variables }) => {
          sent.push(variables);
          return HttpResponse.json({ data: collectionByHandleFixture });
        }),
      );
      return sent;
    }

    it.each([
      ["featured", "COLLECTION_DEFAULT", false],
      ["price-asc", "PRICE", false],
      ["price-desc", "PRICE", true],
      ["best-selling", "BEST_SELLING", false],
    ] as const)("sends %s as %s/reverse=%s", async (sort, sortKey, reverse) => {
      const sent = captureVariables();

      await getCollection("summit-protection-shells", sort);

      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({
        handle: "summit-protection-shells",
        sortKey,
        reverse,
      });
    });

    it("defaults to the collection's own order when no sort is given", async () => {
      const sent = captureVariables();

      await getCollection("summit-protection-shells");

      expect(sent[0]).toMatchObject({ sortKey: "COLLECTION_DEFAULT", reverse: false });
    });

    it("keeps fetching the whole collection in one page", async () => {
      const sent = captureVariables();

      await getCollection("summit-protection-shells", "price-asc");

      // `first: 250` is a literal in the document, so it must not appear as a variable.
      expect(sent[0]).not.toHaveProperty("first");
    });
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

describe("getProduct", () => {
  it("returns the product with all of its variants", async () => {
    const product = await getProduct("waterproof-wading-jacket-with-breathable-shell");

    expect(product?.title).toBe("Waterproof Wading Jacket With Breathable Shell");
    expect(product?.variants).toHaveLength(12);
    expect(product?.images).toHaveLength(3);
  });

  // The API answers an unknown handle with `product: null` and no error, so the fetcher has
  // to distinguish that from a failure; the route turns the null into a 404.
  it("returns null for an unknown handle", async () => {
    await expect(getProduct("does-not-exist")).resolves.toBeNull();
  });

  it("rejects on GraphQL errors instead of returning null", async () => {
    server.use(
      shop.query(ProductByHandleDocument, () =>
        HttpResponse.json({ errors: [{ message: "Throttled" }] }),
      ),
    );

    await expect(getProduct("waterproof-wading-jacket-with-breathable-shell")).rejects.toThrow();
  });

  // A response with neither data nor errors is malformed. Returning null would turn a real
  // product into a 404, so it has to throw and reach the error boundary instead.
  it("rejects on a response carrying no data at all", async () => {
    server.use(shop.query(ProductByHandleDocument, () => HttpResponse.json({ data: null })));

    await expect(getProduct("waterproof-wading-jacket-with-breathable-shell")).rejects.toThrow();
  });
});

describe("getSearchResults", () => {
  it("returns the matching products as ProductCards, plus the total count", async () => {
    const result = await getSearchResults("jacket");

    expect(result.totalCount).toBe(7);
    expect(result.products.map((product) => product.handle)).toEqual([
      "waterproof-wading-jacket-with-breathable-shell",
      "oversized-technical-nylon-jacket",
      "ripstop-shell-jacket-with-storm-guard",
    ]);
  });

  it("short-circuits an empty query without calling the API", async () => {
    let called = false;
    server.use(
      shop.query(SearchDocument, () => {
        called = true;
        return HttpResponse.json({ data: emptySearchFixture });
      }),
    );

    const result = await getSearchResults("");

    expect(result).toEqual({ products: [], totalCount: 0 });
    expect(called).toBe(false);
  });

  it("returns an empty result for a query with no matches", async () => {
    const result = await getSearchResults("no-such-product");

    expect(result).toEqual({ products: [], totalCount: 0 });
  });

  describe("sort variables", () => {
    function captureVariables() {
      const sent: Record<string, unknown>[] = [];
      server.use(
        shop.query(SearchDocument, ({ variables }) => {
          sent.push(variables);
          return HttpResponse.json({ data: searchFixture });
        }),
      );
      return sent;
    }

    it.each([
      ["relevance", "RELEVANCE", false],
      ["price-asc", "PRICE", false],
      ["price-desc", "PRICE", true],
    ] as const)("sends %s as %s/reverse=%s", async (sort, sortKey, reverse) => {
      const sent = captureVariables();

      await getSearchResults("jacket", sort);

      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ query: "jacket", sortKey, reverse });
    });

    it("defaults to relevance when no sort is given", async () => {
      const sent = captureVariables();

      await getSearchResults("jacket");

      expect(sent[0]).toMatchObject({ sortKey: "RELEVANCE", reverse: false });
    });

    it("fetches the whole matching set in one page", async () => {
      const sent = captureVariables();

      await getSearchResults("jacket");

      expect(sent[0]).toMatchObject({ first: 250 });
    });
  });

  it("rejects on GraphQL errors instead of returning an empty result", async () => {
    server.use(
      shop.query(SearchDocument, () =>
        HttpResponse.json({ errors: [{ message: "Internal error" }] }),
      ),
    );

    await expect(getSearchResults("jacket")).rejects.toThrow("Internal error");
  });

  it("rejects on network errors", async () => {
    server.use(shop.query(SearchDocument, () => HttpResponse.error()));

    await expect(getSearchResults("jacket")).rejects.toThrow();
  });
});

/**
 * Required by decision 3 (`docs/predictive-search.md`): `search.edges.node` is a union
 * (`SearchResultItem` = Article | Page | Product, verified 2026-09-27). The cart's
 * `BaseCartLine` fragment already taught this project that a missing `possibleTypes` entry
 * for an abstract type fails **silently** — every field drops to `__typename`-only, no error,
 * no failing mapper test, because mapper tests never touch the normalized cache. This
 * document only ever selects through the union with an inline fragment (`... on Product`),
 * never a named fragment defined directly on `SearchResultItem` itself — reasoning that
 * `POSSIBLE_TYPES` shouldn't need a new entry for it — but that reasoning is exactly the kind
 * this project has already been wrong about once, so it is asserted here instead of trusted.
 */
describe("Apollo cache configuration (SearchResultItem union)", () => {
  function roundTrip(cache: InMemoryCache) {
    cache.writeQuery({
      query: SearchDocument,
      variables: { query: "jacket", first: 250, sortKey: "RELEVANCE", reverse: false },
      data: searchFixture,
    });
    return cache.readQuery({
      query: SearchDocument,
      variables: { query: "jacket", first: 250, sortKey: "RELEVANCE", reverse: false },
    });
  }

  it("round-trips a search result through the real RSC cache config with every field intact", () => {
    // The same POSSIBLE_TYPES the RSC client actually uses (`rsc-client.ts`) — it has no
    // `SearchResultItem` entry today, which is the thing being verified, not assumed.
    const read = roundTrip(new InMemoryCache({ possibleTypes: POSSIBLE_TYPES }));
    const node = read?.search.edges[0]?.node;

    expect(node).toMatchObject({
      __typename: "Product",
      handle: "waterproof-wading-jacket-with-breathable-shell",
      title: "Waterproof Wading Jacket With Breathable Shell",
    });
    // The failure mode this guards against is fields silently dropping to `__typename`-only.
    expect(Object.keys(node ?? {}).length).toBeGreaterThan(1);
  });

  it("round-trips even with no possibleTypes configured at all, confirming the union needs none", () => {
    const read = roundTrip(new InMemoryCache());
    const node = read?.search.edges[0]?.node;

    expect(Object.keys(node ?? {}).length).toBeGreaterThan(1);
  });
});
