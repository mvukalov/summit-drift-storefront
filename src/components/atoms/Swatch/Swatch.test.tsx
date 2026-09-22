import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Swatch } from "./Swatch";

describe("Swatch", () => {
  it("is a radio named by its visible label", () => {
    render(<Swatch name="color" value="moss" color="#4f5d3a" label="Moss" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "Moss" })).not.toBeChecked();
  });

  it("reflects the selected state", () => {
    render(
      <Swatch name="color" value="moss" color="#4f5d3a" label="Moss" selected onChange={vi.fn()} />,
    );

    expect(screen.getByRole("radio", { name: "Moss" })).toBeChecked();
  });

  it("calls onChange when the label is clicked", async () => {
    const onChange = vi.fn();
    render(<Swatch name="color" value="moss" color="#4f5d3a" label="Moss" onChange={onChange} />);

    await userEvent.click(screen.getByText("Moss"));

    expect(onChange).toHaveBeenCalledOnce();
  });

  it("cannot be selected when disabled", async () => {
    const onChange = vi.fn();
    render(
      <Swatch
        name="color"
        value="moss"
        color="#4f5d3a"
        label="Moss"
        disabled
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByText("Moss"));

    expect(screen.getByRole("radio", { name: "Moss" })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves between swatches of the same group with the arrow keys", async () => {
    const onChange = vi.fn();
    render(
      <fieldset>
        <legend>Color</legend>
        <Swatch
          name="color"
          value="slate"
          color="#333a45"
          label="Slate"
          selected
          onChange={onChange}
        />
        <Swatch name="color" value="moss" color="#4f5d3a" label="Moss" onChange={onChange} />
      </fieldset>,
    );

    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Slate" })).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Moss" })).toHaveFocus();
    expect(onChange).toHaveBeenCalled();
  });
});
