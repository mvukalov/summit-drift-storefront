import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchSortControl } from "./SearchSortControl";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockClear();
});

describe("SearchSortControl", () => {
  it("shows the current sort", () => {
    render(<SearchSortControl q="jacket" value="price-asc" />);

    expect(screen.getByRole("combobox", { name: "Sort:" })).toHaveValue("price-asc");
  });

  it("pushes the new sort with the query, without scrolling", async () => {
    const user = userEvent.setup();
    render(<SearchSortControl q="jacket" value="relevance" />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort:" }), "price-desc");

    expect(push).toHaveBeenCalledWith("/search?q=jacket&sort=price-desc", { scroll: false });
  });

  // Page 1 is implied by leaving `page` out: a new ordering starts from the top.
  it("drops back to page 1 on a sort change", async () => {
    const user = userEvent.setup();
    render(<SearchSortControl q="jacket" value="price-desc" />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort:" }), "relevance");

    expect(push).toHaveBeenCalledWith("/search?q=jacket", { scroll: false });
  });
});
