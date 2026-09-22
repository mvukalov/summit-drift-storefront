import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a native button that does not submit forms by default", () => {
    render(<Button>Add to cart</Button>);

    expect(screen.getByRole("button", { name: "Add to cart" })).toHaveAttribute("type", "button");
  });

  it("can still be a submit button when asked", () => {
    render(<Button type="submit">Subscribe</Button>);

    expect(screen.getByRole("button", { name: "Subscribe" })).toHaveAttribute("type", "submit");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Add to cart</Button>);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not respond to clicks when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Add to cart
      </Button>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("marks itself busy, blocks clicks and announces loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Add to cart
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Loading Add to cart" });

    await userEvent.click(button);

    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("passes a ref to the native button so callers can move focus to it", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Menu</Button>);

    ref.current?.focus();

    expect(ref.current).toBe(screen.getByRole("button", { name: "Menu" }));
    expect(ref.current).toHaveFocus();
  });

  it("is not busy when not loading", () => {
    render(<Button>Add to cart</Button>);

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
