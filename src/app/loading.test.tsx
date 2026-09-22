import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/loading";

describe("Home loading state", () => {
  it("announces that the store is loading", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading the store");
  });

  it("hides the skeleton placeholders from assistive technology", () => {
    const { container } = render(<Loading />);

    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});
