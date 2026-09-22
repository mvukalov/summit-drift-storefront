import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Price } from "./Price";

const price = { amount: "249.0", currencyCode: "USD" } as const;
const compareAtPrice = { amount: "323.7", currencyCode: "USD" } as const;

describe("Price", () => {
  it("renders the formatted current price", () => {
    render(<Price price={price} />);

    expect(screen.getByText("$249.00")).toBeInTheDocument();
  });

  it("shows the struck-through original price with a text prefix when on sale", () => {
    render(<Price price={price} compareAtPrice={compareAtPrice} isOnSale />);

    expect(screen.getByRole("deletion")).toHaveTextContent("Original price: $323.70");
  });

  it("hides the compare-at price when the product is not on sale", () => {
    render(<Price price={price} compareAtPrice={compareAtPrice} isOnSale={false} />);

    expect(screen.queryByText("$323.70")).not.toBeInTheDocument();
  });

  it("shows only the current price when on sale without a compare-at price", () => {
    render(<Price price={price} compareAtPrice={null} isOnSale />);

    expect(screen.getByText("$249.00")).toBeInTheDocument();
    expect(screen.queryByText(/Original price/)).not.toBeInTheDocument();
  });
});
