import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PredictiveSearchDocument } from "@/lib/graphql/generated/graphql";
import { SHOPIFY_API_URL } from "@/lib/graphql/config";
import { shop } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import {
  emptyPredictiveSearchFixture,
  predictiveSearchFixture,
} from "@/test/msw/fixtures/predictiveSearch";
import { SearchCombobox } from "./SearchCombobox";

// This is the app's only client-Apollo consumer (docs/predictive-search.md), so it is also
// the first component test that needs a real network round trip. MSW is wired up locally,
// the same way `stubDialog`/`unstubDialog` are scoped to the files that need them, rather
// than in the shared client-project setup file.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderCombobox() {
  const client = new ApolloClient({
    link: new HttpLink({ uri: SHOPIFY_API_URL }),
    cache: new InMemoryCache(),
  });
  return render(
    <ApolloProvider client={client}>
      <SearchCombobox />
    </ApolloProvider>,
  );
}

function getInput() {
  return screen.getByRole("combobox", { name: "Search products" });
}

beforeEach(() => {
  push.mockClear();
});

describe("SearchCombobox", () => {
  it("renders closed, with no listbox", () => {
    renderCombobox();

    expect(getInput()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("fires no query below MIN_QUERY_LENGTH", async () => {
    let called = false;
    server.use(
      shop.query(PredictiveSearchDocument, () => {
        called = true;
        return HttpResponse.json({ data: emptyPredictiveSearchFixture });
      }),
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    renderCombobox();
    fireEvent.change(getInput(), { target: { value: "j" } });
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(called).toBe(false);
    expect(getInput()).toHaveAttribute("aria-expanded", "false");

    vi.useRealTimers();
  });

  it("fires exactly one query after the debounce settles, and shows the results", async () => {
    let calls = 0;
    server.use(
      shop.query(PredictiveSearchDocument, ({ variables }) => {
        calls += 1;
        return HttpResponse.json({
          data:
            variables.query === "jacket" ? predictiveSearchFixture : emptyPredictiveSearchFixture,
        });
      }),
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    renderCombobox();
    fireEvent.change(getInput(), { target: { value: "jacket" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    vi.useRealTimers();

    await waitFor(() => expect(getInput()).toHaveAttribute("aria-expanded", "true"));
    expect(calls).toBe(1);
    expect(screen.getByRole("listbox", { name: "Search results" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByText("Waterproof Wading Jacket With Breathable Shell")).toBeInTheDocument();
  });

  // The response is held with a promise rather than msw's `delay()`: `delay` schedules a
  // `setTimeout` on the fake clock, which never fires once the test returns to real timers.
  it("shows a distinct message while the query is in flight", async () => {
    let releaseResponse: () => void = () => {};
    const responseHeld = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    server.use(
      shop.query(PredictiveSearchDocument, async () => {
        await responseHeld;
        return HttpResponse.json({ data: predictiveSearchFixture });
      }),
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    renderCombobox();
    fireEvent.change(getInput(), { target: { value: "jacket" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    vi.useRealTimers();

    expect(screen.getByText("Searching…")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    // No listbox yet, so nothing for the combobox to claim is expanded or controlled.
    expect(getInput()).toHaveAttribute("aria-expanded", "false");
    expect(getInput()).not.toHaveAttribute("aria-controls");

    releaseResponse();
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("shows a distinct, spelling-check message for a query with no matches", async () => {
    server.use(
      shop.query(PredictiveSearchDocument, () =>
        HttpResponse.json({ data: emptyPredictiveSearchFixture }),
      ),
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    renderCombobox();
    fireEvent.change(getInput(), { target: { value: "zzzznotfound" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    vi.useRealTimers();

    await waitFor(() =>
      expect(
        screen.getByText(/No results for “zzzznotfound” — check the spelling\./),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    // Regression: this state used to claim `aria-expanded="true"` with `aria-controls`
    // pointing at a listbox that wasn't rendered (axe critical: aria-valid-attr-value).
    expect(getInput()).toHaveAttribute("aria-expanded", "false");
    expect(getInput()).not.toHaveAttribute("aria-controls");
  });

  it("points aria-controls at the rendered listbox once there are results", async () => {
    server.use(
      shop.query(PredictiveSearchDocument, () =>
        HttpResponse.json({ data: predictiveSearchFixture }),
      ),
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    renderCombobox();
    fireEvent.change(getInput(), { target: { value: "jacket" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    vi.useRealTimers();

    const listbox = await screen.findByRole("listbox");
    expect(getInput()).toHaveAttribute("aria-controls", listbox.id);
  });

  describe("once results are showing", () => {
    async function typeJacket() {
      server.use(
        shop.query(PredictiveSearchDocument, ({ variables }) =>
          HttpResponse.json({
            data:
              variables.query === "jacket" ? predictiveSearchFixture : emptyPredictiveSearchFixture,
          }),
        ),
      );
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      renderCombobox();
      fireEvent.change(getInput(), { target: { value: "jacket" } });
      await act(() => vi.advanceTimersByTimeAsync(300));
      vi.useRealTimers();

      await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    }

    it("moves the active option with ArrowDown/ArrowUp", async () => {
      await typeJacket();
      const input = getInput();
      const options = screen.getAllByRole("option");

      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input).toHaveAttribute("aria-activedescendant", options[0]?.id);

      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input).toHaveAttribute("aria-activedescendant", options[1]?.id);

      fireEvent.keyDown(input, { key: "ArrowUp" });
      expect(input).toHaveAttribute("aria-activedescendant", options[0]?.id);
    });

    it("navigates to the active option on Enter", async () => {
      await typeJacket();
      const input = getInput();

      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(push).toHaveBeenCalledWith("/products/waterproof-wading-jacket-with-breathable-shell");
    });

    it("navigates to the results page on Enter with nothing active", async () => {
      await typeJacket();

      fireEvent.submit(getInput().closest("form")!);

      expect(push).toHaveBeenCalledWith("/search?q=jacket");
    });

    it("navigates to the results page from the See all results button", async () => {
      await typeJacket();

      fireEvent.click(screen.getByRole("button", { name: "See all results" }));

      expect(push).toHaveBeenCalledWith("/search?q=jacket");
    });

    it("closes on Escape without clearing the input", async () => {
      await typeJacket();
      const input = getInput();

      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(input).toHaveValue("jacket");
      expect(input).toHaveAttribute("aria-expanded", "false");
    });

    it("reopens on ArrowDown after Escape, with the first option active", async () => {
      await typeJacket();
      const input = getInput();

      fireEvent.keyDown(input, { key: "Escape" });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(input).toHaveAttribute("aria-expanded", "true");
      expect(input).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[0]?.id);
    });

    it("announces the result count in a live region", async () => {
      await typeJacket();

      expect(screen.getByRole("status")).toHaveTextContent("3 results");
    });

    it("navigates on clicking an option", async () => {
      await typeJacket();

      fireEvent.click(screen.getAllByRole("option")[1]!);

      expect(push).toHaveBeenCalledWith("/products/oversized-technical-nylon-jacket");
    });
  });

  /**
   * "Verify first" #1 (docs/predictive-search.md / context/features/013-search-spec.md):
   * confirms Apollo Client 4's documented auto-abort behavior against real code, not just
   * against the docs. A rapid keystroke sequence fires two predictiveSearch calls. The first
   * ("ja") is held open; the second ("jacket") resolves immediately. Only after "jacket"'s
   * results are on screen is "ja" released — with a different (empty) answer. If Apollo had
   * not aborted the first call, that late, stale response would flip the combobox to
   * "No results"; it must not.
   */
  it("ignores a slower, earlier response that lands after the latest one", async () => {
    let releaseSlowQuery: () => void = () => {};
    const slowQueryHeld = new Promise<void>((resolve) => {
      releaseSlowQuery = resolve;
    });
    let slowQuerySignal: AbortSignal | undefined;

    server.use(
      shop.query(PredictiveSearchDocument, async ({ request, variables }) => {
        if (variables.query === "ja") {
          slowQuerySignal = request.signal;
          await slowQueryHeld;
          return HttpResponse.json({ data: emptyPredictiveSearchFixture });
        }
        return HttpResponse.json({
          data:
            variables.query === "jacket" ? predictiveSearchFixture : emptyPredictiveSearchFixture,
        });
      }),
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    renderCombobox();
    fireEvent.change(getInput(), { target: { value: "ja" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    fireEvent.change(getInput(), { target: { value: "jacket" } });
    await act(() => vi.advanceTimersByTimeAsync(300));

    vi.useRealTimers();

    await waitFor(() =>
      expect(
        screen.getByText("Waterproof Wading Jacket With Breathable Shell"),
      ).toBeInTheDocument(),
    );
    // The mechanism, not just its effect: starting "jacket" aborted the in-flight "ja".
    expect(slowQuerySignal?.aborted).toBe(true);

    // Now let the stale "ja" response arrive, and give it time to (not) apply.
    releaseSlowQuery();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.queryByText(/No results for/)).not.toBeInTheDocument();
  });
});
