"use client";

import { useCallback, useId, useRef, useState, type MouseEvent, type RefObject } from "react";

export interface ModalDialogProps {
  ref: RefObject<HTMLDialogElement | null>;
  id: string;
  "aria-labelledby": string;
  onClose: () => void;
  onClick: (event: MouseEvent<HTMLDialogElement>) => void;
}

export interface ModalTriggerProps {
  ref: RefObject<HTMLButtonElement | null>;
  "aria-haspopup": "dialog";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
}

export interface UseModalDialog {
  /** Spread onto the `<dialog>`. */
  dialogProps: ModalDialogProps;
  /** Spread onto the `<button>` that opens it. */
  triggerProps: ModalTriggerProps;
  /** For the heading the dialog is labelled by. */
  titleId: string;
  /** Whether the dialog is open, for anything the props don't cover. */
  isOpen: boolean;
  /** Closes the dialog; `onClose` then runs as usual. */
  close: () => void;
}

/**
 * Wiring for a native modal `<dialog>`.
 *
 * `showModal()` makes the rest of the page inert and turns Escape into a `close` event, so
 * the focus trap and the Escape handler are the browser's rather than hand-written ones.
 * What is left is the bookkeeping this hook owns: the two refs, the open flag that drives
 * `aria-expanded`, the ids tying trigger and dialog together, focus return on close, and
 * treating a backdrop click as a close.
 */
export function useModalDialog(): UseModalDialog {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dialogId = useId();
  const titleId = useId();

  const open = useCallback(() => {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Runs for every way the dialog closes (button, Escape, link, backdrop). Browsers restore
  // focus on their own too; doing it explicitly keeps the behaviour the same everywhere.
  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // A click on the backdrop targets the <dialog> itself; clicks on its content target children.
  const handleDialogClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) close();
    },
    [close],
  );

  return {
    dialogProps: {
      ref: dialogRef,
      id: dialogId,
      "aria-labelledby": titleId,
      onClose: handleClose,
      onClick: handleDialogClick,
    },
    triggerProps: {
      ref: triggerRef,
      "aria-haspopup": "dialog",
      "aria-expanded": isOpen,
      "aria-controls": dialogId,
      onClick: open,
    },
    titleId,
    isOpen,
    close,
  };
}
