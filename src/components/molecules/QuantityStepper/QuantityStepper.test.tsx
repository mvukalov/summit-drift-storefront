import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./QuantityStepper";

// Controlled component: a harness owns the state so interactions behave like the real page.
function Harness({ initial = 1, min, max }: { initial?: number; min?: number; max?: number }) {
  const [value, setValue] = useState(initial);
  return <QuantityStepper value={value} onChange={setValue} min={min} max={max} />;
}

function getInput() {
  return screen.getByLabelText("Quantity");
}

describe("QuantityStepper", () => {
  it("labels the input and both buttons", () => {
    render(<Harness />);

    expect(getInput()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeInTheDocument();
  });

  it("increments and decrements", async () => {
    const user = userEvent.setup();
    render(<Harness initial={2} />);

    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(getInput()).toHaveValue(3);

    await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(getInput()).toHaveValue(2);
  });

  it("disables decrement at the minimum rather than going below it", async () => {
    render(<Harness initial={1} min={1} />);

    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });

  it("disables increment at the maximum", async () => {
    const user = userEvent.setup();
    render(<Harness initial={9} max={10} />);

    const increase = screen.getByRole("button", { name: "Increase quantity" });
    await user.click(increase);

    expect(getInput()).toHaveValue(10);
    expect(increase).toBeDisabled();
  });

  it("accepts a typed value", async () => {
    const user = userEvent.setup();
    render(<Harness initial={1} min={1} max={10} />);

    await user.clear(getInput());
    await user.type(getInput(), "5");

    expect(getInput()).toHaveValue(5);
  });

  // Clamping mid-keystroke would make a typo impossible to correct, so an out-of-range
  // value is left on screen while typing and settles on the limit at blur.
  it("shows an over-maximum value while typing, then clamps it on blur", async () => {
    const user = userEvent.setup();
    render(<Harness initial={1} min={1} max={10} />);

    await user.clear(getInput());
    await user.type(getInput(), "99");
    expect(getInput()).toHaveValue(99);

    await user.tab();
    expect(getInput()).toHaveValue(10);
  });

  it("clamps a typed value below the minimum on blur", async () => {
    const user = userEvent.setup();
    render(<Harness initial={5} min={2} max={10} />);

    await user.clear(getInput());
    await user.type(getInput(), "1");
    await user.tab();

    expect(getInput()).toHaveValue(2);
  });

  // Clearing the field mid-edit must not be reported as a quantity change.
  it("does not emit a change while the field is empty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityStepper value={3} onChange={onChange} min={1} />);

    await user.clear(getInput());

    expect(onChange).not.toHaveBeenCalled();
  });

  it("falls back to the minimum when the field is left empty on blur", async () => {
    const user = userEvent.setup();
    render(<Harness initial={3} min={1} />);

    await user.clear(getInput());
    await user.tab();

    expect(getInput()).toHaveValue(1);
  });

  it("disables every control when disabled", () => {
    render(<QuantityStepper value={2} onChange={vi.fn()} disabled />);

    expect(getInput()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
  });
});
