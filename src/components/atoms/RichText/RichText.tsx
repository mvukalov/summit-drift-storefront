import { sanitizeRichText } from "@/lib/sanitize/rich-text";
import styles from "./RichText.module.scss";

export interface RichTextProps {
  /**
   * Raw `descriptionHtml` from the Storefront API. Passed through as-is — sanitizing is
   * this component's job, not the caller's.
   */
  html: string;
}

/**
 * The one place API-supplied markup is written into the DOM.
 *
 * Callers hand over the raw value and this component sanitizes it, so no code path can
 * render `descriptionHtml` unsanitized. `JsonLd` is the only other component allowed to
 * use `dangerouslySetInnerHTML`, and it handles JSON rather than markup. ESLint enforces
 * both: `react/no-danger` is on project-wide and `sanitize-html` may only be imported
 * from `src/lib/sanitize/`.
 */
export function RichText({ html }: RichTextProps) {
  const clean = sanitizeRichText(html);

  // A description that is empty, or that sanitizes down to nothing, renders no wrapper at
  // all rather than an empty box with margins.
  if (!clean) return null;

  return (
    <div
      className={styles.richText}
      // Sanitized on the line above: the only escape hatch for API markup
      // (coding standards §Security).
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
