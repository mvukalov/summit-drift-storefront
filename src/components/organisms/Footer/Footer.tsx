import Link from "next/link";
import type { MenuItem } from "@/types/navigation";
import styles from "./Footer.module.scss";

export interface FooterProps {
  /** Collection links, from the same `main-menu` data as the header. */
  items: MenuItem[];
}

export function Footer({ items }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.wordmark}>Summit Drift</p>
          <p className={styles.blurb}>
            Expedition-grade apparel cut for the long climb and finished on a clean workbench.
          </p>
        </div>

        {items.length > 0 && (
          <nav aria-labelledby="footer-collections">
            <h2 id="footer-collections" className={styles.heading}>
              Collections
            </h2>
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.link}>
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  );
}
