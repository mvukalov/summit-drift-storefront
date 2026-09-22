import Link from "next/link";
import { buttonClassName } from "@/components/atoms/Button/Button";
import styles from "./error.module.scss";

// Rendered for any notFound() in the app: unknown collection handles today, product
// handles next. Reuses the error layout so the two states look like one family.
export default function NotFound() {
  return (
    <div className={styles.error}>
      <h1>We couldn&apos;t find that page</h1>
      <p className={styles.message}>
        The page you were looking for may have moved, or the link may be out of date.
      </p>
      <Link href="/" className={buttonClassName("primary")}>
        Back to home
      </Link>
    </div>
  );
}
