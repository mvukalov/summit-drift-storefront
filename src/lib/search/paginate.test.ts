import { describe, expect, it } from "vitest";
import { paginate } from "./paginate";

const items = Array.from({ length: 10 }, (_, i) => i + 1); // [1..10]

describe("paginate", () => {
  it("returns an empty page for an empty input, never crashing", () => {
    expect(paginate([], 1, 4)).toEqual({ items: [], page: 1, totalPages: 1 });
  });

  it("slices the first page", () => {
    expect(paginate(items, 1, 4)).toEqual({ items: [1, 2, 3, 4], page: 1, totalPages: 3 });
  });

  it("slices a middle page", () => {
    expect(paginate(items, 2, 4)).toEqual({ items: [5, 6, 7, 8], page: 2, totalPages: 3 });
  });

  it("returns a partial last page", () => {
    expect(paginate(items, 3, 4)).toEqual({ items: [9, 10], page: 3, totalPages: 3 });
  });

  it("returns an exact-boundary last page in full", () => {
    // 8 items, page size 4: two full pages, no partial remainder.
    expect(paginate(items.slice(0, 8), 2, 4)).toEqual({
      items: [5, 6, 7, 8],
      page: 2,
      totalPages: 2,
    });
  });

  it("clamps a page beyond totalPages down to the last page", () => {
    expect(paginate(items, 99, 4)).toEqual({ items: [9, 10], page: 3, totalPages: 3 });
  });

  it("clamps a page below 1 up to the first page", () => {
    expect(paginate(items, 0, 4)).toEqual({ items: [1, 2, 3, 4], page: 1, totalPages: 3 });
    expect(paginate(items, -5, 4)).toEqual({ items: [1, 2, 3, 4], page: 1, totalPages: 3 });
  });

  it("uses SEARCH_PAGE_SIZE by default", () => {
    const result = paginate(items, 1);
    expect(result).toEqual({ items, page: 1, totalPages: 1 });
  });
});
