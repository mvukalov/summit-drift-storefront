import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFacetsView } from "@/lib/facets/counts";
import { deriveFacets } from "@/lib/facets/derive";
import type { SelectedFacets } from "@/lib/facets/url";
import { makeProduct } from "@/test/products";
import { FilterDrawer } from "./FilterDrawer";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const PATH = "/collections/summit-protection-shells";

const products = [
  makeProduct({
    handle: "moss-m",
    price: "50.0",
    options: [
      { name: "color", values: ["moss"] },
      { name: "size", values: ["M"] },
    ],
  }),
  makeProduct({
    handle: "clay-m",
    price: "300.0",
    isOnSale: true,
    options: [
      { name: "color", values: ["clay"] },
      { name: "size", values: ["M"] },
    ],
  }),
];

function select(overrides: Partial<SelectedFacets> = {}): SelectedFacets {
  return { options: {}, price: null, onSale: false, ...overrides };
}

// Same stubs as the header's mobile nav: jsdom (v30) has no showModal()/close(), so these
// toggle `open` and fire `close` like a browser. The native parts — Escape closing the
// dialog and the inert page behind it trapping focus — are checked in a real browser.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterAll(() => {
  // @ts-expect-error -- removing the test-only stubs; jsdom doesn't define these methods.
  delete HTMLDialogElement.prototype.showModal;
  // @ts-expect-error -- see above.
  delete HTMLDialogElement.prototype.close;
});

beforeEach(() => {
  push.mockClear();
});

function renderDrawer(selected = select(), resultCount = products.length) {
  render(
    <FilterDrawer
      view={buildFacetsView(products, deriveFacets(products), selected)}
      selected={selected}
      basePath={PATH}
      sort="featured"
      resultCount={resultCount}
    />,
  );
  return screen.getByRole("button", { name: /Filters/ });
}

async function openDrawer(selected = select(), resultCount = products.length) {
  const user = userEvent.setup();
  const trigger = renderDrawer(selected, resultCount);
  await user.click(trigger);
  return { user, trigger, dialog: screen.getByRole("dialog", { name: "Filters" }) };
}

describe("FilterDrawer", () => {
  it("starts closed", () => {
    renderDrawer();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says the panel it controls is collapsed", () => {
    const trigger = renderDrawer();

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("counts the active filters on the trigger", () => {
    const trigger = renderDrawer(select({ options: { color: ["moss"] }, onSale: true }));

    expect(trigger).toHaveTextContent("Filters (2)");
  });

  it("shows no count when nothing is filtered", () => {
    expect(renderDrawer()).toHaveTextContent(/^Filters$/);
  });

  it("opens the panel and marks the trigger expanded", async () => {
    const { trigger, dialog } = await openDrawer();

    expect(dialog).toHaveAttribute("open");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("holds the same facet controls as the sidebar", async () => {
    const { dialog } = await openDrawer();

    expect(within(dialog).getByRole("group", { name: "Color" })).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "Size" })).toBeInTheDocument();
  });

  // Choosing several filters in one visit is the point of a drawer; closing on the first
  // one would send the shopper back and forth.
  it("stays open while filters are applied", async () => {
    const { user, dialog } = await openDrawer();

    await user.click(within(dialog).getByRole("checkbox", { name: /^Moss/ }));

    expect(push).toHaveBeenCalledWith(`${PATH}?color=moss`, { scroll: false });
    expect(dialog).toHaveAttribute("open");
  });

  it("closes with the close button and returns focus to the trigger", async () => {
    const { user, trigger, dialog } = await openDrawer();

    await user.click(within(dialog).getByRole("button", { name: "Close filters" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  // A browser closes a modal dialog on Escape and fires `close`; calling close() stands in.
  it("syncs state and returns focus when the dialog closes on its own", async () => {
    const { trigger, dialog } = await openDrawer();

    (dialog as HTMLDialogElement).close();

    // findBy* waits for React to flush the state change the `close` event triggered.
    expect(await screen.findByRole("button", { name: /Filters/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(trigger).toHaveFocus();
  });

  it("closes on a backdrop click but not on a click inside the panel", async () => {
    const { user, dialog } = await openDrawer();

    await user.click(within(dialog).getByRole("heading", { name: "Filters" }));
    expect(dialog).toHaveAttribute("open");

    // Clicks on ::backdrop are dispatched to the <dialog> element itself.
    await user.click(dialog);
    expect(dialog).not.toHaveAttribute("open");
  });

  describe("footer", () => {
    it("confirms how many products are left", async () => {
      const { dialog } = await openDrawer(select(), 6);

      expect(within(dialog).getByRole("button", { name: "Show 6 products" })).toBeInTheDocument();
    });

    it("uses the singular for a single result", async () => {
      const { dialog } = await openDrawer(select(), 1);

      expect(within(dialog).getByRole("button", { name: "Show 1 product" })).toBeInTheDocument();
    });

    it("closes the drawer from the confirmation", async () => {
      const { user, dialog } = await openDrawer(select(), 2);

      await user.click(within(dialog).getByRole("button", { name: /^Show/ }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // The chips row and its "Clear all" are behind the modal and unreachable while it's open.
    it("clears every filter", async () => {
      const { user, dialog } = await openDrawer(select({ options: { color: ["moss"] } }));

      await user.click(within(dialog).getByRole("button", { name: "Clear all" }));

      expect(push).toHaveBeenCalledWith(PATH, { scroll: false });
    });

    it("offers no Clear all when nothing is filtered", async () => {
      const { dialog } = await openDrawer();

      expect(within(dialog).queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
    });
  });
});
