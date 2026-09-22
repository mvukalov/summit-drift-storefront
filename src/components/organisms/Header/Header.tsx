import Link from "next/link";
import { Button } from "@/components/atoms/Button/Button";
import type { MenuItem } from "@/types/navigation";
import { CartIcon } from "./icons";
import { MobileNav } from "./MobileNav";
import styles from "./Header.module.scss";

export interface HeaderProps {
  /** Primary navigation, from the `main-menu` API menu. */
  items: MenuItem[];
}

// Server Component: only MobileNav (open/close state) ships as client JavaScript.
export function Header({ items }: HeaderProps) {
  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.wordmark}>Summit Drift</span>{" "}
            <span className={styles.tagline}>Outfitters</span>
          </Link>

          {items.length > 0 && (
            <nav aria-label="Primary" className={styles.nav}>
              <ul className={styles.navList}>
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={styles.navLink}>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className={styles.actions}>
            {/* Placeholder until the cart feature adds the drawer and item count. */}
            <Button variant="ghost" className={styles.iconButton} aria-label="Cart">
              <CartIcon />
            </Button>
            <MobileNav items={items} />
          </div>
        </div>
      </header>
    </>
  );
}
