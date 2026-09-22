import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("is labelled by its visible label", () => {
    render(<Input label="Email address" type="email" />);

    expect(screen.getByRole("textbox", { name: "Email address" })).toHaveAttribute("type", "email");
  });

  it("uses a given id for the label association", () => {
    render(<Input label="Search" id="site-search" />);

    expect(screen.getByLabelText("Search")).toHaveAttribute("id", "site-search");
  });

  it("generates a unique id per input when none is given", () => {
    render(
      <>
        <Input label="First name" />
        <Input label="Last name" />
      </>,
    );

    const first = screen.getByRole("textbox", { name: "First name" });
    const last = screen.getByRole("textbox", { name: "Last name" });
    expect(first.id).not.toBe(last.id);
  });

  it("calls onChange as the user types", async () => {
    const onChange = vi.fn();
    render(<Input label="Search" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Search" }), "shell");

    expect(onChange).toHaveBeenCalledTimes(5);
    expect(screen.getByRole("textbox")).toHaveValue("shell");
  });

  it("hides the icon from screen readers", () => {
    render(<Input label="Search" icon={<svg data-testid="icon" />} />);

    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("is disabled", () => {
    render(<Input label="Search" disabled />);

    expect(screen.getByRole("textbox", { name: "Search" })).toBeDisabled();
  });
});
