"use client";

import { useLazyQuery } from "@apollo/client/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Price } from "@/components/atoms/Price/Price";
import { ProductImage } from "@/components/atoms/ProductImage/ProductImage";
import { VisuallyHidden } from "@/components/atoms/VisuallyHidden/VisuallyHidden";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { toProductCard } from "@/lib/catalog/mappers";
import { PredictiveSearchDocument } from "@/lib/graphql/generated/graphql";
import { searchHref } from "@/lib/search/params";
import { DEFAULT_SEARCH_SORT } from "@/lib/search/sort";
import styles from "./SearchCombobox.module.scss";

// UI choices, not API limits (docs/predictive-search.md, decision 1): the API itself accepts
// a 1-character query, and `predictiveSearch.limit` is server-capped 1-10.
const MIN_QUERY_LENGTH = 2;
const PREDICTIVE_LIMIT = 6;
// Matches the cart stepper's existing constant (CartProvider.QUANTITY_SEND_DELAY_MS) rather
// than inventing a second number for the same "how long is a pause" judgment call.
const DEBOUNCE_MS = 300;

const THUMBNAIL_SIZES = "48px";

/**
 * Header predictive search: a WAI-ARIA "list autocomplete" combobox (no inline text
 * completion) backed by client-side Apollo. `useLazyQuery` is the one place in this app that
 * still needs the client Apollo cache — see `docs/predictive-search.md` for why this and not
 * a Server Action or a Route Handler.
 *
 * Real DOM focus never leaves the input; the active option is communicated only through
 * `aria-activedescendant`, which is what lets arrow keys "move" without a focus trap.
 */
export function SearchCombobox() {
  const router = useRouter();
  const listboxId = useId();
  const inputId = useId();

  const [inputValue, setInputValue] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebouncedValue(inputValue, DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const qualifies = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const [runPredictiveSearch, { data, loading, called }] = useLazyQuery(PredictiveSearchDocument);

  useEffect(() => {
    if (!qualifies) return;
    // Apollo Client 4 aborts any still-pending call from here automatically, and swallows the
    // resulting rejection — no manual cancellation or try/catch needed for the stale-response
    // race this debounce would otherwise leave open (verified, docs/predictive-search.md).
    runPredictiveSearch({ variables: { query: trimmedQuery, limit: PREDICTIVE_LIMIT } });
  }, [qualifies, trimmedQuery, runPredictiveSearch]);

  const products = qualifies ? (data?.predictiveSearch?.products ?? []).map(toProductCard) : [];
  const showListbox = qualifies && !isDismissed;
  const isSearching = showListbox && (loading || !called);
  const hasResults = showListbox && !isSearching && products.length > 0;
  const hasNoResults = showListbox && !isSearching && products.length === 0;

  const activeOptionId =
    activeIndex >= 0 && products[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
    setIsDismissed(false);
    setActiveIndex(-1);
  }

  function goToProduct(handle: string) {
    setIsDismissed(true);
    router.push(`/products/${handle}`);
  }

  function goToResultsPage() {
    const q = inputValue.trim();
    if (!q) return;
    setIsDismissed(true);
    router.push(searchHref({ q, sort: DEFAULT_SEARCH_SORT, page: 1 }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToResultsPage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      // APG: Escape closes the listbox without clearing the input's text.
      if (showListbox) {
        event.preventDefault();
        setIsDismissed(true);
      }
      return;
    }

    // APG: Down Arrow on a closed combobox opens it with the first option active — e.g. after
    // Escape, or back on the input once a result has been opened.
    if (event.key === "ArrowDown" && isDismissed && qualifies) {
      event.preventDefault();
      setIsDismissed(false);
      setActiveIndex(0);
      return;
    }

    if (!hasResults) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % products.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + products.length) % products.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      const product = products[activeIndex];
      if (product) {
        // Prevents the form's own submit-to-/search behavior for this case only.
        event.preventDefault();
        goToProduct(product.handle);
      }
    }
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    const next = event.relatedTarget;
    if (!event.currentTarget.contains(next)) {
      setIsDismissed(true);
    }
  }

  const announcement = hasNoResults
    ? `No results for "${trimmedQuery}"`
    : hasResults
      ? `${products.length} result${products.length === 1 ? "" : "s"}`
      : "";

  return (
    <form role="search" className={styles.combobox} onSubmit={handleSubmit} onBlur={handleBlur}>
      <VisuallyHidden>
        <label htmlFor={inputId}>Search products</label>
      </VisuallyHidden>
      <div className={styles.control}>
        <svg className={styles.icon} aria-hidden="true" focusable="false" viewBox="0 0 20 20">
          <path
            d="M13.5 13.5 18 18M15 9a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          id={inputId}
          type="search"
          className={styles.input}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search products"
          role="combobox"
          // The listbox only exists when there are results; the loading and no-results
          // states are messages, not a popup, so pointing at it then would reference nothing
          // (axe: aria-valid-attr-value, critical). The live region covers those states.
          aria-expanded={hasResults}
          aria-controls={hasResults ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {showListbox && (
        <div className={styles.panel}>
          {isSearching && <p className={styles.message}>Searching…</p>}
          {hasNoResults && (
            // Matching is case-insensitive substring only, no typo tolerance (verified,
            // docs/predictive-search.md) — the copy doesn't imply a smarter search exists.
            <p className={styles.message}>
              No results for &ldquo;{trimmedQuery}&rdquo; — check the spelling.
            </p>
          )}
          {hasResults && (
            <>
              <ul id={listboxId} role="listbox" aria-label="Search results" className={styles.list}>
                {products.map((product, index) => (
                  <li
                    key={product.handle}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={clsx(styles.option, index === activeIndex && styles.active)}
                    // Keeps focus on the input (the combobox's virtual-focus model) instead
                    // of letting the click blur it first.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToProduct(product.handle)}
                  >
                    <div className={styles.thumbnail}>
                      <ProductImage
                        image={product.image}
                        title={product.title}
                        sizes={THUMBNAIL_SIZES}
                        decorative
                      />
                    </div>
                    <span className={styles.optionTitle}>{product.title}</span>
                    <Price
                      price={product.price}
                      compareAtPrice={product.compareAtPrice}
                      isOnSale={product.isOnSale}
                    />
                  </li>
                ))}
              </ul>
              {/* `predictiveSearch` has no `totalCount` (only `search` does), so this can't
                  promise a number the way the results page can. */}
              <button
                type="submit"
                className={styles.seeAll}
                onMouseDown={(event) => event.preventDefault()}
              >
                See all results
              </button>
            </>
          )}
        </div>
      )}

      <VisuallyHidden>
        <div role="status" aria-live="polite">
          {announcement}
        </div>
      </VisuallyHidden>
    </form>
  );
}
