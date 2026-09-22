import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SortControl } from "./SortControl";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const BASE_PATH = "/collections/summit-protection-shells";

beforeEach(() => {
  push.mockClear();
});

describe("SortControl", () => {
  it("shows the sort coming from the URL, not a local default", () => {
    render(<SortControl value="price-desc" basePath={BASE_PATH} />);

    expect(screen.getByRole("combobox", { name: "Sort:" })).toHaveValue("price-desc");
  });

  it("offers the four sort options", () => {
    render(<SortControl value="featured" basePath={BASE_PATH} />);

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Featured",
      "Price: Low to High",
      "Price: High to Low",
      "Best Selling",
    ]);
  });

  it.each([
    ["price-asc", `${BASE_PATH}?sort=price-asc`],
    ["price-desc", `${BASE_PATH}?sort=price-desc`],
    ["best-selling", `${BASE_PATH}?sort=best-selling`],
  ])("navigates to %s", async (value, expectedUrl) => {
    render(<SortControl value="featured" basePath={BASE_PATH} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort:" }), value);

    expect(push).toHaveBeenCalledWith(expectedUrl, { scroll: false });
  });

  // The default is the absence of the param, so the shared URL stays clean.
  it("drops the param when the user goes back to Featured", async () => {
    render(<SortControl value="price-asc" basePath={BASE_PATH} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort:" }), "featured");

    expect(push).toHaveBeenCalledWith(BASE_PATH, { scroll: false });
  });

  it("keeps the sort param on the collection it was changed from", async () => {
    render(<SortControl value="featured" basePath="/collections/expedition-field-gear" />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort:" }), "price-asc");

    expect(push).toHaveBeenCalledWith("/collections/expedition-field-gear?sort=price-asc", {
      scroll: false,
    });
  });

  // Disabling the control while the server re-renders drops focus to <body>, stranding
  // keyboard users at the top of the document after every sort.
  it("keeps focus on the control after sorting", async () => {
    render(<SortControl value="featured" basePath={BASE_PATH} />);
    const combobox = screen.getByRole("combobox", { name: "Sort:" });

    await userEvent.selectOptions(combobox, "price-asc");

    expect(combobox).toBeEnabled();
    expect(combobox).toHaveFocus();
  });

  it("navigates once per change, so the server renders one new order", async () => {
    render(<SortControl value="featured" basePath={BASE_PATH} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort:" }), "price-asc");

    expect(push).toHaveBeenCalledOnce();
  });
});
