/**
 * jsdom (v30) implements no `HTMLDialogElement.showModal()` or `close()`.
 *
 * These stubs only toggle the `open` attribute and fire `close` the way a browser does, which
 * is enough to cover a component's own wiring: open/close state, ARIA attributes and focus
 * return. The genuinely native parts — Escape closing the dialog, and the rest of the page
 * going inert so focus is trapped — are not exercised here and are checked in a real browser.
 *
 * TODO: `Header.test.tsx`, `FilterDrawer.test.tsx` and `useModalDialog.test.tsx` still carry
 * their own copies of these stubs, written before this helper existed. Fold them in at the
 * next `/cleanup`; they are identical.
 */
export function stubDialog(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

export function unstubDialog(): void {
  // @ts-expect-error -- removing the test-only stubs; jsdom doesn't define these methods.
  delete HTMLDialogElement.prototype.showModal;
  // @ts-expect-error -- see above.
  delete HTMLDialogElement.prototype.close;
}
