import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_SORT,
  SEARCH_SORT_OPTIONS,
  parseSearchSortParam,
  toSearchSortVariables,
  type SearchSortOption,
} from "./sort";

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

describe("toSearchSortVariables", () => {
  it.each([
    ["relevance", { sortKey: "RELEVANCE", reverse: false }],
    ["price-asc", { sortKey: "PRICE", reverse: false }],
    // High to low is the same key, reversed — not a separate sort key.
    ["price-desc", { sortKey: "PRICE", reverse: true }],
  ] as const)("maps %s to its GraphQL variables", (sort, expected) => {
    expect(toSearchSortVariables(sort)).toEqual(expected);
  });

  it("maps every option, so no option can reach the API unmapped", () => {
    for (const sort of ALL_OPTIONS satisfies readonly SearchSortOption[]) {
      expect(toSearchSortVariables(sort).sortKey).toBeTruthy();
    }
  });
});
