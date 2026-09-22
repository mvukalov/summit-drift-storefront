import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import styles from "./loading.module.scss";
import pageStyles from "./page.module.scss";

const PLACEHOLDER_TILES = ["a", "b", "c", "d"];

// Mirrors the Home layout (hero, then a grid) so the page doesn't jump when data arrives.
export default function Loading() {
  return (
    <div aria-busy="true">
      <p role="status">
        <VisuallyHidden>Loading the store</VisuallyHidden>
      </p>
      <div className={pageStyles.hero} aria-hidden="true">
        <div className={pageStyles.heroText}>
          <div className={styles.lineShort} />
          <div className={styles.lineHeading} />
          <div className={styles.line} />
        </div>
      </div>
      <div className={pageStyles.section} aria-hidden="true">
        <div className={styles.lineHeading} />
        <div className={pageStyles.grid}>
          {PLACEHOLDER_TILES.map((key) => (
            <div key={key} className={styles.frame} />
          ))}
        </div>
      </div>
    </div>
  );
}
