import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import skeleton from "@/app/loading.module.scss";
import styles from "./page.module.scss";

// Mirrors the PDP layout (gallery beside title, price and picker) so nothing jumps when
// the data lands.
export default function ProductLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <p role="status">
        <VisuallyHidden>Loading the product</VisuallyHidden>
      </p>
      <div className={skeleton.frame} aria-hidden="true" />
      <div className={styles.details} aria-hidden="true">
        <div className={skeleton.lineHeading} />
        <div className={skeleton.lineShort} />
        <div className={skeleton.line} />
        <div className={skeleton.line} />
      </div>
    </div>
  );
}
