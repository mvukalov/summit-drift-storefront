import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { stubDialog, unstubDialog } from "@/test/dialog";

import { useModalDialog } from "./useModalDialog";

// jsdom implements <dialog> but not showModal/close; see src/test/dialog.ts for what the
// stub covers and doesn't. The real modality and focus trap are the browser's and are
// verified in Chromium, not here.
beforeAll(stubDialog);
afterAll(unstubDialog);

function Harness() {
  const { dialogProps, triggerProps, titleId, isOpen, close } = useModalDialog();

  return (
    <>
      <button {...triggerProps}>Open{isOpen ? " (open)" : ""}</button>
      <dialog {...dialogProps}>
        <h2 id={titleId}>Panel</h2>
        <button onClick={close}>Close</button>
      </dialog>
    </>
  );
}

function getTrigger() {
  return screen.getByRole("button", { name: /^Open/ });
}

describe("useModalDialog", () => {
  it("wires the trigger to the dialog by id and labels it by its heading", () => {
    render(<Harness />);

    const trigger = getTrigger();
    const dialog = screen.getByRole("dialog", { hidden: true });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    expect(dialog).toHaveAttribute("aria-labelledby", screen.getByText("Panel").id);
  });

  it("opens on the trigger and reflects that in aria-expanded", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(getTrigger()).toHaveAttribute("aria-expanded", "false");

    await user.click(getTrigger());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(getTrigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("closes via the returned close function and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(getTrigger());
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(getTrigger()).toHaveAttribute("aria-expanded", "false");
    expect(getTrigger()).toHaveFocus();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(getTrigger());
    // A backdrop click lands on the <dialog> element itself.
    await user.click(screen.getByRole("dialog"));

    expect(getTrigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("stays open when the click lands on its content", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(getTrigger());
    await user.click(screen.getByText("Panel"));

    expect(getTrigger()).toHaveAttribute("aria-expanded", "true");
  });

  // The browser fires `close` for Escape without a keydown handler, so the hook has to pick
  // the state change up from the event rather than from the key.
  it("syncs state when the dialog closes on its own", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(getTrigger());
    // Closing outside React's event system, the way Escape does.
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    act(() => dialog.close());

    expect(getTrigger()).toHaveAttribute("aria-expanded", "false");
  });
});
