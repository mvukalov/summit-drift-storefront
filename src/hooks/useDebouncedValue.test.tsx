import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

function Harness({ value, delayMs }: { value: string; delayMs: number }) {
  const debounced = useDebouncedValue(value, delayMs);
  return <output>{debounced}</output>;
}

function getOutput() {
  return screen.getByRole("status");
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("returns the initial value immediately", () => {
    render(<Harness value="a" delayMs={300} />);
    expect(getOutput()).toHaveTextContent("a");
  });

  it("does not update before the delay elapses", async () => {
    const { rerender } = render(<Harness value="a" delayMs={300} />);
    rerender(<Harness value="ab" delayMs={300} />);

    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(getOutput()).toHaveTextContent("a");
  });

  it("updates once the delay elapses", async () => {
    const { rerender } = render(<Harness value="a" delayMs={300} />);
    rerender(<Harness value="ab" delayMs={300} />);

    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(getOutput()).toHaveTextContent("ab");
  });

  it("only commits the last value of a rapid sequence", async () => {
    const { rerender } = render(<Harness value="a" delayMs={300} />);
    rerender(<Harness value="ab" delayMs={300} />);
    await act(() => vi.advanceTimersByTimeAsync(100));
    rerender(<Harness value="abc" delayMs={300} />);
    await act(() => vi.advanceTimersByTimeAsync(100));
    rerender(<Harness value="abcd" delayMs={300} />);

    // The first two updates never got 300ms of quiet, so they never committed.
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(getOutput()).toHaveTextContent("a");

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(getOutput()).toHaveTextContent("abcd");
  });
});
