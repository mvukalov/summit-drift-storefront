"use client";

import { useEffect } from "react";
import { Button } from "@/components/atoms/Button/Button";
import styles from "./error.module.scss";

interface ErrorProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the segment (Next 16); `reset()` would re-render without refetching. */
  retry: () => void;
}

export default function HomeError({ error, retry }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className={styles.error} role="alert">
      <h1>We couldn&apos;t load the store</h1>
      <p className={styles.message}>
        Something went wrong on our side. Check your connection and try again.
      </p>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
