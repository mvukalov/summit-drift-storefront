"use client";

import Link from "next/link";
import { useId, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/atoms/Button/Button";
import type { MenuItem } from "@/types/navigation";
import { CloseIcon, MenuIcon } from "./icons";
import styles from "./MobileNav.module.scss";

export interface MobileNavProps {
  items: MenuItem[];
}

// A native modal <dialog>: showModal() makes the rest of the page inert (focus stays inside)
// and turns Escape into a `close` event, so neither needs hand-written handling here.
//
// TODO: this dialog wiring (refs, open state, showModal/close, focus return, backdrop click)
// is duplicated in organisms/FilterSidebar/FilterDrawer.tsx. Two copies is under the
// project's 3+ rule for extracting a shared `useModalDialog` hook, so it stays duplicated
// on purpose. Revisit at the next /cleanup pass, or as soon as a third dialog appears.
export function MobileNav({ items }: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();

  function openPanel() {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }

  function closePanel() {
    dialogRef.current?.close();
  }

  // Runs for every way the dialog closes (button, Escape, link, backdrop). Browsers restore
  // focus on their own too; doing it explicitly keeps the behaviour the same everywhere.
  function handleClose() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  // A click on the backdrop targets the <dialog> itself; clicks on its content target children.
  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closePanel();
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        className={styles.trigger}
        aria-label="Menu"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={openPanel}
      >
        <MenuIcon />
      </Button>

      <dialog
        ref={dialogRef}
        id={panelId}
        className={styles.panel}
        aria-labelledby={titleId}
        onClose={handleClose}
        onClick={handleDialogClick}
      >
        <div className={styles.content}>
          <div className={styles.top}>
            <h2 id={titleId} className={styles.title}>
              Menu
            </h2>
            <Button
              variant="secondary"
              className={styles.close}
              aria-label="Close menu"
              onClick={closePanel}
            >
              <CloseIcon />
            </Button>
          </div>

          {items.length > 0 && (
            <nav aria-label="Primary">
              <ul className={styles.list}>
                {items.map((item) => (
                  <li key={item.href}>
                    {/* The layout stays mounted across client navigations, so close explicitly. */}
                    <Link href={item.href} className={styles.link} onClick={closePanel}>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </dialog>
    </>
  );
}
