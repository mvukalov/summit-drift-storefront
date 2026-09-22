// One source of truth for the site's origin: `metadataBase` in the root layout resolves
// canonical URLs against it, and structured data needs the same absolute URLs.
// Vercel sets NEXT_PUBLIC_SITE_URL per deployment; the fallback keeps local builds working.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** A site-relative path as an absolute URL. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
