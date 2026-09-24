import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProductError from "./error";

const error = Object.assign(new Error("Upstream exploded"), { digest: "abc123" });

describe("ProductError", () => {
  it("announces the failure as an alert", () => {
    render(<ProductError error={error} retry={vi.fn()} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/couldn't load/i);
  });

  // No raw messages, stack traces or digests in the UI (coding standards §Error Handling).
  it("does not leak the underlying error to the user", () => {
    render(<ProductError error={error} retry={vi.fn()} />);

    expect(screen.queryByText(/Upstream exploded/)).not.toBeInTheDocument();
    expect(screen.queryByText(/abc123/)).not.toBeInTheDocument();
  });

  it("re-fetches the segment when the shopper retries", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<ProductError error={error} retry={retry} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
