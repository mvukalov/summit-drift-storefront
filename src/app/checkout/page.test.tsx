import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CheckoutPage, { metadata } from "@/app/checkout/page";
import { renderWithCart, testCart, testLine } from "@/test/cart";

vi.mock("@/lib/cart/actions", () => import("@/test/cart-actions"));

describe("Checkout page", () => {
  it("renders the summary from the cart the layout seeded, under one level-1 heading", () => {
    renderWithCart(<CheckoutPage />, testCart([testLine()]));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Order summary" })).toBeInTheDocument();
  });

  it("is kept out of search indexes", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
