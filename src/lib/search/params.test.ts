import { describe, expect, it } from "vitest";
import { searchHref } from "./params";

describe("searchHref", () => {
  it("leaves the defaults out, so a plain search URL is just the query", () => {
    expect(searchHref({ q: "jacket", sort: "relevance", page: 1 })).toBe("/search?q=jacket");
  });

  it("adds a non-default sort and page", () => {
    expect(searchHref({ q: "jacket", sort: "price-asc", page: 2 })).toBe(
      "/search?q=jacket&sort=price-asc&page=2",
    );
  });

  it("encodes the query text", () => {
    expect(searchHref({ q: "rain & wind", sort: "relevance", page: 1 })).toBe(
      "/search?q=rain+%26+wind",
    );
  });
});
