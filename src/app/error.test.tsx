import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HomeError from "@/app/error";

describe("Home error state", () => {
  it("shows a short message without the raw error", () => {
    render(<HomeError error={new Error("GraphQL: Internal error")} retry={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load the store");
    expect(screen.queryByText(/Internal error/)).not.toBeInTheDocument();
  });

  it("retries when the user asks to try again", async () => {
    const retry = vi.fn();
    render(<HomeError error={new Error("Network error")} retry={retry} />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
