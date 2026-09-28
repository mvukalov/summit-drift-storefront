import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { money, testLine } from "@/test/cart";
import { CartLineSummary } from "./CartLineSummary";

// `@/test/cart` also exports render helpers that pull in `CartProvider` and, through it, the
// Server Actions module, which can't load in jsdom.
vi.mock("@/lib/cart/actions", () => import("@/test/cart-actions"));

const LINE = testLine({ quantity: 3, unitPrice: money("25.00") });

describe("CartLineSummary", () => {
  it("shows the title, the formatted options and the line total", () => {
    render(<CartLineSummary line={LINE} />);

    expect(screen.getByText("Ripstop Shell Jacket")).toBeInTheDocument();
    expect(screen.getByText("Slate / M")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
  });

  it("leaves the quantity to the caller by default", () => {
    render(<CartLineSummary line={LINE} />);

    expect(screen.queryByText(/Quantity/)).not.toBeInTheDocument();
  });

  it("spells out the quantity and unit price when asked to", () => {
    render(<CartLineSummary line={LINE} showQuantity />);

    expect(screen.getByText(/Quantity 3/)).toHaveTextContent("Quantity 3, $25.00 each");
  });

  it("omits the options row for a line with no options", () => {
    const { container } = render(<CartLineSummary line={testLine({ options: [] })} />);

    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
