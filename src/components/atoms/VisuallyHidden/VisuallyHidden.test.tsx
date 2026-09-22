import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisuallyHidden } from "./VisuallyHidden";

describe("VisuallyHidden", () => {
  it("keeps its text in the accessibility tree", () => {
    render(
      <button type="button">
        <VisuallyHidden>Close cart</VisuallyHidden>
      </button>,
    );

    expect(screen.getByRole("button", { name: "Close cart" })).toBeInTheDocument();
  });
});
