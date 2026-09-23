"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { useRouter } from "next/navigation";
import { clearFacets, collectionHref, countActiveFacets } from "@/lib/facets/query";
import { FilterPanel, type FilterPanelProps } from "./FilterPanel";
import { CloseIcon, FilterIcon } from "./icons";
import styles from "./FilterDrawer.module.scss";

export interface FilterDrawerProps extends Omit<FilterPanelProps, "onNavigate"> {
  /** Products currently on the page, for the "Show N products" confirmation. */
  resultCount: number;
}

/**
 * The mobile filter trigger and the panel it opens.
 *
 * A native modal `<dialog>`, like the header's mobile nav: `showModal()` makes the rest of
 * the page inert and turns Escape into a `close` event, so the focus trap and the Escape
 * handler are the browser's rather than hand-written ones.
 *
 * The drawer deliberately stays open while filters are applied — the counts and the panel
 * re-render behind it, so several filters can be chosen in one visit. That is the one
 * behavioural difference from the header's nav, which closes as soon as a link is followed.
 */
// TODO: this dialog wiring (refs, open state, showModal/close, focus return, backdrop click)
// is duplicated in organisms/Header/MobileNav.tsx. Two copies is under the project's 3+ rule
// for extracting a shared `useModalDialog` hook, so it stays duplicated on purpose. Revisit
// at the next /cleanup pass, or as soon as a third dialog appears.
export function FilterDrawer({ resultCount, ...panelProps }: FilterDrawerProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();

  const activeCount = countActiveFacets(panelProps.selected);

  function openDrawer() {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }

  function closeDrawer() {
    dialogRef.current?.close();
  }

  // Runs however the dialog closes (button, Escape, backdrop). Browsers restore focus on
  // their own as well; doing it explicitly keeps the behaviour identical everywhere.
  function handleClose() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  // A backdrop click targets the <dialog> itself; content clicks target its children.
  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDrawer();
  }

  function handleClearAll() {
    router.push(collectionHref(panelProps.basePath, clearFacets(), panelProps.sort), {
      scroll: false,
    });
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="secondary"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={openDrawer}
      >
        <FilterIcon />
        Filters{activeCount > 0 && ` (${activeCount})`}
      </Button>

      <dialog
        ref={dialogRef}
        id={panelId}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={handleClose}
        onClick={handleDialogClick}
      >
        <div className={styles.content}>
          <div className={styles.top}>
            <h2 id={titleId} className={styles.title}>
              Filters
            </h2>
            <Button
              variant="ghost"
              className={styles.close}
              aria-label="Close filters"
              onClick={closeDrawer}
            >
              <CloseIcon />
            </Button>
          </div>

          <div className={styles.body}>
            <FilterPanel {...panelProps} />
          </div>

          {/* The chips row and its "Clear all" sit behind the modal and can't be reached
              while it is open, so the drawer carries its own. */}
          <div className={styles.footer}>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={handleClearAll}>
                Clear all
              </Button>
            )}
            <Button onClick={closeDrawer}>
              Show {resultCount} {resultCount === 1 ? "product" : "products"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
