import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FacetGroup, type FacetGroupOption } from "./FacetGroup";

const colors: FacetGroupOption[] = [
  { value: "slate", label: "Slate", count: 8, selected: false, color: "#333a45" },
  { value: "moss", label: "Moss", count: 6, selected: true, color: "#4f5d3a" },
  { value: "clay", label: "Clay", count: 4, selected: false, color: "#b5623f" },
];

function renderGroup(props: Partial<React.ComponentProps<typeof FacetGroup>> = {}) {
  const onChange = vi.fn();
  render(
    <FacetGroup legend="Color" name="color" options={colors} onChange={onChange} {...props} />,
  );
  return { onChange };
}

describe("FacetGroup", () => {
  it("names the group so each option is announced with its axis", () => {
    renderGroup();

    expect(screen.getByRole("group", { name: "Color" })).toBeInTheDocument();
  });

  it("renders one checkbox per value", () => {
    renderGroup();

    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  // A bare number would be read as part of the name ("Moss 6").
  it("spells the count out in the accessible name", () => {
    renderGroup();

    expect(screen.getByRole("checkbox", { name: "Moss, 6 products" })).toBeInTheDocument();
  });

  it("uses the singular for a value with one product", () => {
    renderGroup({ options: [{ value: "clay", label: "Clay", count: 1, selected: false }] });

    expect(screen.getByRole("checkbox", { name: "Clay, 1 product" })).toBeInTheDocument();
  });

  it("omits the count from an option that has none", () => {
    renderGroup({ type: "radio", options: [{ value: "", label: "Any price", selected: true }] });

    expect(screen.getByRole("radio", { name: "Any price" })).toBeInTheDocument();
  });

  it("shows the selection the props describe, not local state", () => {
    renderGroup();

    expect(screen.getByRole("checkbox", { name: "Moss, 6 products" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Slate, 8 products" })).not.toBeChecked();
  });

  it("reports the value and its new state when one is chosen", async () => {
    const { onChange } = renderGroup();

    await userEvent.click(screen.getByRole("checkbox", { name: "Clay, 4 products" }));

    expect(onChange).toHaveBeenCalledWith("clay", true);
  });

  it("reports a deselection", async () => {
    const { onChange } = renderGroup();

    await userEvent.click(screen.getByRole("checkbox", { name: "Moss, 6 products" }));

    expect(onChange).toHaveBeenCalledWith("moss", false);
  });

  it("renders radios where only one value fits", () => {
    renderGroup({ type: "radio" });

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("puts every option in the same group, so radios are mutually exclusive", () => {
    renderGroup({ type: "radio", name: "price" });

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveAttribute("name", "price");
    }
  });

  it("is operable from the keyboard", async () => {
    const { onChange } = renderGroup();

    await userEvent.tab();
    await userEvent.keyboard(" ");

    expect(onChange).toHaveBeenCalledWith("slate", true);
  });

  it("renders nothing to choose from for an axis with no values", () => {
    renderGroup({ options: [] });

    expect(screen.getByRole("group", { name: "Color" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  // Color is never the only signal (§8): the label is always there, and the dot is
  // decoration on top of it.
  it("hides the color dot from screen readers", () => {
    const { container } = render(
      <FacetGroup legend="Color" name="color" options={colors} onChange={vi.fn()} />,
    );

    expect(
      container.querySelectorAll("[aria-hidden='true'][style*='--facet-dot-color']"),
    ).toHaveLength(3);
  });

  it("draws no dot for a value with no color", () => {
    const { container } = render(
      <FacetGroup
        legend="Size"
        name="size"
        options={[{ value: "M", label: "M", count: 2, selected: false }]}
        onChange={vi.fn()}
      />,
    );

    expect(container.querySelector("[style*='--facet-dot-color']")).toBeNull();
  });
});
