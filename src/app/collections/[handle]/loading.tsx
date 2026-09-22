import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import skeleton from "@/app/loading.module.scss";
import styles from "./page.module.scss";

const PLACEHOLDER_TILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Mirrors the collection layout (title, toolbar, grid) so the page doesn't jump when data lands.
export default function CollectionLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <p role="status">
        <VisuallyHidden>Loading the collection</VisuallyHidden>
      </p>
      <div className={styles.header} aria-hidden="true">
        <div className={skeleton.lineHeading} />
        <div className={skeleton.line} />
      </div>
      <div className={styles.toolbar} aria-hidden="true">
        <div className={skeleton.lineShort} />
      </div>
      <div className={styles.grid} aria-hidden="true">
        {PLACEHOLDER_TILES.map((key) => (
          <div key={key} className={skeleton.frame} />
        ))}
      </div>
    </div>
  );
}
