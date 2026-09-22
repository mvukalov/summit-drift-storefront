import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

const OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

describe("Select", () => {
  it("is labelled by its visible label", () => {
    render(<Select label="Sort" options={OPTIONS} />);

    expect(screen.getByRole("combobox", { name: "Sort" })).toBeInTheDocument();
  });

  it("renders every option with its label", () => {
    render(<Select label="Sort" options={OPTIONS} />);

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Featured",
      "Price: Low to High",
      "Price: High to Low",
    ]);
  });

  it("uses a given id for the label association", () => {
    render(<Select label="Sort" options={OPTIONS} id="collection-sort" />);

    expect(screen.getByLabelText("Sort")).toHaveAttribute("id", "collection-sort");
  });

  it("generates a unique id per select when none is given", () => {
    render(
      <>
        <Select label="Sort" options={OPTIONS} />
        <Select label="Filter" options={OPTIONS} />
      </>,
    );

    expect(screen.getByRole("combobox", { name: "Sort" }).id).not.toBe(
      screen.getByRole("combobox", { name: "Filter" }).id,
    );
  });

  it("reflects the controlled value", () => {
    render(<Select label="Sort" options={OPTIONS} value="price-desc" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveValue("price-desc");
  });

  it("calls onChange with the chosen option", async () => {
    const onChange = vi.fn();
    render(<Select label="Sort" options={OPTIONS} defaultValue="featured" onChange={onChange} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "price-asc");

    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveValue("price-asc");
  });

  it("is reachable and operable with the keyboard", async () => {
    render(<Select label="Sort" options={OPTIONS} defaultValue="featured" onChange={vi.fn()} />);

    await userEvent.tab();

    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveFocus();
  });

  it("is disabled", () => {
    render(<Select label="Sort" options={OPTIONS} disabled />);

    expect(screen.getByRole("combobox", { name: "Sort" })).toBeDisabled();
  });

  it("hides the chevron from screen readers", () => {
    const { container } = render(<Select label="Sort" options={OPTIONS} />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the label in the accessibility tree when laid out inline", () => {
    render(<Select label="Sort:" options={OPTIONS} inline />);

    expect(screen.getByRole("combobox", { name: "Sort:" })).toBeInTheDocument();
  });
});
