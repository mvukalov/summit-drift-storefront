import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the store name as the level-1 heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Summit Drift Outfitters" }),
    ).toBeInTheDocument();
  });
});
