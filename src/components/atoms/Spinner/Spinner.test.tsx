import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("is a status region announcing Loading by default", () => {
    render(<Spinner />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("announces a custom label", () => {
    render(<Spinner label="Updating cart" />);

    expect(screen.getByRole("status")).toHaveTextContent("Updating cart");
  });
});
