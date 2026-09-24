"use client";

import Link from "next/link";
import { Button } from "@/components/atoms/Button/Button";
import { useModalDialog } from "@/hooks/useModalDialog";
import type { MenuItem } from "@/types/navigation";
import { CloseIcon, MenuIcon } from "./icons";
import styles from "./MobileNav.module.scss";

export interface MobileNavProps {
  items: MenuItem[];
}

// The dialog wiring lives in `useModalDialog`; the browser handles the focus trap and Escape.
export function MobileNav({ items }: MobileNavProps) {
  const { dialogProps, triggerProps, titleId, close } = useModalDialog();

  return (
    <>
      <Button {...triggerProps} variant="ghost" className={styles.trigger} aria-label="Menu">
        <MenuIcon />
      </Button>

      <dialog {...dialogProps} className={styles.panel}>
        <div className={styles.content}>
          <div className={styles.top}>
            <h2 id={titleId} className={styles.title}>
              Menu
            </h2>
            <Button
              variant="secondary"
              className={styles.close}
              aria-label="Close menu"
              onClick={close}
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
                    <Link href={item.href} className={styles.link} onClick={close}>
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
