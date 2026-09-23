import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterChip } from "./FilterChip";

describe("FilterChip", () => {
  it("shows the filter it stands for", () => {
    render(<FilterChip label="Size M" onRemove={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveTextContent("Size M");
  });

  // Speech input activates a control by its visible text, so the name has to start with it.
  it("says what activating it does, starting from the visible label", () => {
    render(<FilterChip label="Moss" onRemove={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Moss, remove filter" })).toBeInTheDocument();
  });

  it("removes the filter when clicked", async () => {
    const onRemove = vi.fn();
    render(<FilterChip label="Moss" onRemove={onRemove} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("removes the filter from the keyboard", async () => {
    const onRemove = vi.fn();
    render(<FilterChip label="On sale" onRemove={onRemove} />);

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(onRemove).toHaveBeenCalledOnce();
  });

  // Inside a <form> a bare <button> would submit it.
  it("is not a submit button", () => {
    render(<FilterChip label="Moss" onRemove={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
