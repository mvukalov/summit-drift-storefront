import { describe, expect, it } from "vitest";
import { parseSearchParams } from "./params";

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
});
