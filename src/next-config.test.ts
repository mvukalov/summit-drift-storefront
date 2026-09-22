// @vitest-environment node
// Every catalog image URL must match a `remotePatterns` entry, or /_next/image rejects it
// with a 400 in production. Catches a new CDN path family before users do.
import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { collectionByHandleFixture } from "@/test/msw/fixtures/collectionByHandle";
import { collectionsFixture } from "@/test/msw/fixtures/collections";
import { featuredProductsFixture } from "@/test/msw/fixtures/featuredProducts";

const remotePatterns = nextConfig.images?.remotePatterns ?? [];

function isAllowed(url: string): boolean {
  return hasRemoteMatch([], remotePatterns, new URL(url));
}

// Recursively collects `url` fields of Image objects from a real API response.
function imageUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(imageUrls);
  if (typeof value !== "object" || value === null) return [];
  const own =
    "__typename" in value && value.__typename === "Image" && "url" in value
      ? [String(value.url)]
      : [];
  return [...own, ...Object.values(value).flatMap(imageUrls)];
}

describe("next.config images.remotePatterns", () => {
  const fixtureUrls = [
    collectionsFixture,
    collectionByHandleFixture,
    featuredProductsFixture,
  ].flatMap(imageUrls);

  it("allows every image URL in the captured API responses", () => {
    expect(fixtureUrls.length).toBeGreaterThan(0);
    expect(fixtureUrls.filter((url) => !isAllowed(url))).toEqual([]);
  });

  it("allows the mock.shop media path family (seen in product galleries)", () => {
    expect(
      isAllowed(
        "https://cdn.shopify.com/mock-shop-production-media/apparel-outdoor/6ebde316-051f-4e50-b9e8-c2e67d5b2ac2.png",
      ),
    ).toBe(true);
  });

  it.each([
    ["another host", "https://example.com/s/files/1/0926/4031/3366/files/a.png"],
    ["another Shopify store", "https://cdn.shopify.com/s/files/1/0001/0002/files/a.png"],
    ["plain http", "http://cdn.shopify.com/s/files/1/0926/4031/3366/files/a.png"],
    [
      "a query on the media family",
      "https://cdn.shopify.com/mock-shop-production-media/apparel-outdoor/a.png?width=10",
    ],
  ])("rejects %s", (_, url) => {
    expect(isAllowed(url)).toBe(false);
  });
});
