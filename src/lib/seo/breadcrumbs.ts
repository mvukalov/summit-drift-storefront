import { absoluteUrl } from "./site";

export interface Breadcrumb {
  name: string;
  /** Site-relative path; serialized as an absolute URL, which schema.org expects. */
  path: string;
}

/**
 * A schema.org BreadcrumbList. `position` is 1-based and must match the trail's order,
 * so the list is built from the trail rather than assembled by callers.
 */
export function buildBreadcrumbList(trail: readonly Breadcrumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}
