import { describe, expect, it } from "vitest";
import { SEARCH_SORT_OPTIONS, toSearchSortVariables, type SearchSortOption } from "./sort";

const ALL_OPTIONS = SEARCH_SORT_OPTIONS.map((option) => option.value);

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
