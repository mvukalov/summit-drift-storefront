import Link from "next/link";
import type { MenuItem } from "@/types/navigation";
import styles from "./Footer.module.scss";

const SOURCE_URL = "https://github.com/mvukalov/summit-drift-storefront";

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

      <div className={styles.credit}>
        <p className={styles.byline}>
          <span>Portfolio project by Martin Vukalović</span>
          <a href={SOURCE_URL} className={styles.link}>
            Source on GitHub
          </a>
        </p>
        <p>
          Summit Drift is a fictional brand. Product data and images come from mock.shop. No real
          orders are placed.
        </p>
      </div>
    </footer>
  );
}
