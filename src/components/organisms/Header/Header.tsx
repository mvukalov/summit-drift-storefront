import Link from "next/link";
import type { MenuItem } from "@/types/navigation";
import { CartTrigger } from "./CartTrigger";
import { MobileNav } from "./MobileNav";
import styles from "./Header.module.scss";

export interface HeaderProps {
  /** Primary navigation, from the `main-menu` API menu. */
  items: MenuItem[];
}

// Server Component: only MobileNav and CartTrigger ship as client JavaScript.
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
            <CartTrigger />
            <MobileNav items={items} />
          </div>
        </div>
      </header>
    </>
  );
}
