import { describe, expect, it } from "vitest";
import { DEFAULT_SEARCH_SORT, SEARCH_SORT_OPTIONS } from "./sort";
import { searchHref } from "./params";
import { parseSearchParams, parseSearchSortParam } from "./parse";

const ALL_OPTIONS = SEARCH_SORT_OPTIONS.map((option) => option.value);

describe("parseSearchSortParam", () => {
  it.each(ALL_OPTIONS)("accepts %s", (value) => {
    expect(parseSearchSortParam(value)).toBe(value);
  });

  it("falls back to the default when the param is absent", () => {
    expect(parseSearchSortParam(undefined)).toBe(DEFAULT_SEARCH_SORT);
  });

  // A hand-edited or stale URL must still render a page, never throw.
  it.each([
    ["an unknown value", "cheapest"],
    ["an empty string", ""],
    ["a GraphQL sort key", "RELEVANCE"],
    ["the wrong case", "Price-Asc"],
  ])("falls back to the default for %s", (_label, value) => {
    expect(parseSearchSortParam(value)).toBe(DEFAULT_SEARCH_SORT);
  });

  // `?sort=a&sort=b` reaches the page as an array.
  it("falls back to the default for a repeated param", () => {
    expect(parseSearchSortParam(["price-asc", "price-desc"])).toBe(DEFAULT_SEARCH_SORT);
  });
});

describe("parseSearchParams", () => {
  it("reads q, sort and page from the URL", () => {
    expect(parseSearchParams({ q: "jacket", sort: "price-asc", page: "2" })).toEqual({
      q: "jacket",
      sort: "price-asc",
      page: 2,
    });
  });

  it("defaults to an empty query, relevance sort and page 1 when absent", () => {
    expect(parseSearchParams({})).toEqual({ q: "", sort: "relevance", page: 1 });
  });

  it("trims whitespace around q", () => {
    expect(parseSearchParams({ q: "  jacket  " }).q).toBe("jacket");
  });

  it("caps an absurdly long q rather than passing it through", () => {
    const tooLong = "a".repeat(500);
    expect(parseSearchParams({ q: tooLong }).q).toBe("");
  });

  it("falls back to the default sort for an invalid value", () => {
    expect(parseSearchParams({ sort: "cheapest" }).sort).toBe("relevance");
  });

  // `?q=a&q=b` and `?page=1&page=2` reach the page as arrays; the last value wins.
  it("takes the last value of a repeated q or page param", () => {
    expect(parseSearchParams({ q: ["jacket", "boots"], page: ["1", "3"] })).toEqual({
      q: "boots",
      sort: "relevance",
      page: 3,
    });
  });

  it.each([
    ["zero", "0"],
    ["negative", "-1"],
    ["non-numeric", "abc"],
  ])("clamps an invalid page (%s) to 1", (_label, value) => {
    expect(parseSearchParams({ page: value }).page).toBe(1);
  });

  it("accepts a very large page number as-is (paginate() clamps it against the result set)", () => {
    expect(parseSearchParams({ page: "9999" }).page).toBe(9999);
  });

  // Whatever the page renders from must be what a link built by `searchHref` leads back to.
  it.each([
    { q: "jacket", sort: "relevance", page: 1 },
    { q: "rain & wind", sort: "price-desc", page: 3 },
    { q: "Ülle's 100% wool", sort: "price-asc", page: 1 },
  ] as const)("round-trips through searchHref: %o", (params) => {
    const query = new URL(searchHref(params), "https://example.test").searchParams;
    expect(parseSearchParams(Object.fromEntries(query))).toEqual(params);
  });
});
