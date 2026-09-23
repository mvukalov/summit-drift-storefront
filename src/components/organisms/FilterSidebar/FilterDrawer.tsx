"use client";

import { Button } from "@/components/atoms/Button/Button";
import { useModalDialog } from "@/hooks/useModalDialog";
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
 * A native modal `<dialog>`, like the header's mobile nav: the shared `useModalDialog` hook
 * owns the wiring, and the browser owns the focus trap and the Escape handler.
 *
 * The drawer deliberately stays open while filters are applied — the counts and the panel
 * re-render behind it, so several filters can be chosen in one visit. That is the one
 * behavioural difference from the header's nav, which closes as soon as a link is followed.
 */
export function FilterDrawer({ resultCount, ...panelProps }: FilterDrawerProps) {
  const router = useRouter();
  const { dialogProps, triggerProps, titleId, close } = useModalDialog();

  const activeCount = countActiveFacets(panelProps.selected);

  function handleClearAll() {
    router.push(collectionHref(panelProps.basePath, clearFacets(), panelProps.sort), {
      scroll: false,
    });
  }

  return (
    <>
      <Button {...triggerProps} variant="secondary" className={styles.trigger}>
        <FilterIcon />
        Filters{activeCount > 0 && ` (${activeCount})`}
      </Button>

      <dialog {...dialogProps} className={styles.dialog}>
        <div className={styles.content}>
          <div className={styles.top}>
            <h2 id={titleId} className={styles.title}>
              Filters
            </h2>
            <Button
              variant="ghost"
              className={styles.close}
              aria-label="Close filters"
              onClick={close}
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
            <Button onClick={close}>
              Show {resultCount} {resultCount === 1 ? "product" : "products"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
