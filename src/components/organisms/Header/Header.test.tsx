import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MenuItem } from "@/types/navigation";
import { Header } from "./Header";

const ITEMS: MenuItem[] = [
  { title: "Summit Protection Shells", href: "/collections/summit-protection-shells" },
  { title: "Trail Foundation Layers", href: "/collections/trail-foundation-layers" },
];

// jsdom (v30) has no HTMLDialogElement.showModal()/close(). These stubs only toggle `open` and
// fire `close` like a browser, so the tests cover this component's wiring (state, ARIA, focus
// return). The browser-native parts (Escape closing the dialog, the inert page behind it
// trapping focus) are not exercised here; they are checked in a real browser.
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

async function openMenu() {
  const user = userEvent.setup();
  render(<Header items={ITEMS} />);
  const trigger = screen.getByRole("button", { name: "Menu" });
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Menu" });
  return { user, trigger, dialog };
}

describe("Header", () => {
  it("makes the skip link the first focusable element, pointing at the main content", async () => {
    const user = userEvent.setup();
    render(<Header items={ITEMS} />);

    await user.tab();

    const skipLink = screen.getByRole("link", { name: "Skip to content" });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("links the logo to the home page", () => {
    render(<Header items={ITEMS} />);

    expect(screen.getByRole("link", { name: "Summit Drift Outfitters" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders the primary navigation from the menu items", () => {
    render(<Header items={ITEMS} />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Summit Protection Shells", "/collections/summit-protection-shells"],
      ["Trail Foundation Layers", "/collections/trail-foundation-layers"],
    ]);
  });

  it("omits the navigation when there are no menu items", () => {
    render(<Header items={[]} />);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows a cart button", () => {
    render(<Header items={ITEMS} />);

    expect(screen.getByRole("button", { name: "Cart" })).toBeInTheDocument();
  });

  describe("mobile menu", () => {
    it("starts closed", () => {
      render(<Header items={ITEMS} />);

      expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens a labelled panel with the navigation links", async () => {
      const { trigger, dialog } = await openMenu();

      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(trigger).toHaveAttribute("aria-controls", dialog.id);
      expect(
        within(dialog)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(["Summit Protection Shells", "Trail Foundation Layers"]);
    });

    it("closes with the close button and returns focus to the menu button", async () => {
      const { user, trigger } = await openMenu();

      await user.click(screen.getByRole("button", { name: "Close menu" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveFocus();
    });

    // A browser closes a modal dialog on Escape and fires `close`; calling close() stands in
    // for that here, so this covers the component's reaction, not the Escape key itself.
    it("syncs state and returns focus when the dialog closes on its own (Escape)", async () => {
      const { trigger, dialog } = await openMenu();

      (dialog as HTMLDialogElement).close();

      expect(await screen.findByRole("button", { name: "Menu" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(trigger).toHaveFocus();
    });

    it("closes when a navigation link is followed", async () => {
      const { user, dialog, trigger } = await openMenu();
      const link = within(dialog).getByRole("link", { name: "Trail Foundation Layers" });
      // Outside the App Router, next/link falls back to a document navigation jsdom can't do.
      link.addEventListener("click", (event) => event.preventDefault());

      await user.click(link);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("closes on a backdrop click but not on a click inside the panel", async () => {
      const { user, dialog } = await openMenu();

      await user.click(within(dialog).getByRole("heading", { name: "Menu" }));
      expect(dialog).toHaveAttribute("open");

      // Clicks on ::backdrop are dispatched to the <dialog> element itself.
      await user.click(dialog);
      expect(dialog).not.toHaveAttribute("open");
    });
  });
});
