import { describe, expect, it } from "vitest";
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  parseSortParam,
  serializeSortParam,
  toSortVariables,
  type SortOption,
} from "./sort";

const ALL_OPTIONS = SORT_OPTIONS.map((option) => option.value);

describe("parseSortParam", () => {
  it.each(ALL_OPTIONS)("accepts %s", (value) => {
    expect(parseSortParam(value)).toBe(value);
  });

  it("falls back to the default when the param is absent", () => {
    expect(parseSortParam(undefined)).toBe(DEFAULT_SORT);
  });

  // A hand-edited or stale URL must still render a page, never throw.
  it.each([
    ["an unknown value", "cheapest"],
    ["an empty string", ""],
    ["a GraphQL sort key", "PRICE"],
    ["the wrong case", "Price-Asc"],
  ])("falls back to the default for %s", (_label, value) => {
    expect(parseSortParam(value)).toBe(DEFAULT_SORT);
  });

  // `?sort=a&sort=b` reaches the page as an array.
  it("falls back to the default for a repeated param", () => {
    expect(parseSortParam(["price-asc", "price-desc"])).toBe(DEFAULT_SORT);
  });
});

describe("serializeSortParam", () => {
  it("returns an empty string for the default, so the URL stays clean", () => {
    expect(serializeSortParam(DEFAULT_SORT)).toBe("");
  });

  it.each([
    ["price-asc", "?sort=price-asc"],
    ["price-desc", "?sort=price-desc"],
    ["best-selling", "?sort=best-selling"],
  ] as const)("serializes %s", (sort, expected) => {
    expect(serializeSortParam(sort)).toBe(expected);
  });

  it("round-trips every option back through the parser", () => {
    for (const sort of ALL_OPTIONS) {
      const query = serializeSortParam(sort);
      const value = new URLSearchParams(query).get("sort") ?? undefined;
      expect(parseSortParam(value)).toBe(sort);
    }
  });
});

describe("toSortVariables", () => {
  it.each([
    ["featured", { sortKey: "COLLECTION_DEFAULT", reverse: false }],
    ["price-asc", { sortKey: "PRICE", reverse: false }],
    // High to low is the same key, reversed — not a separate sort key.
    ["price-desc", { sortKey: "PRICE", reverse: true }],
    ["best-selling", { sortKey: "BEST_SELLING", reverse: false }],
  ] as const)("maps %s to its GraphQL variables", (sort, expected) => {
    expect(toSortVariables(sort)).toEqual(expected);
  });

  it("maps every option, so no option can reach the API unmapped", () => {
    for (const sort of ALL_OPTIONS satisfies readonly SortOption[]) {
      expect(toSortVariables(sort).sortKey).toBeTruthy();
    }
  });
});
