import { FilterPanel, type FilterPanelProps } from "./FilterPanel";
import styles from "./FilterSidebar.module.scss";

export type FilterSidebarProps = Omit<FilterPanelProps, "onNavigate">;

/**
 * The desktop filter column beside the product grid.
 *
 * A Server Component: only `FilterPanel` ships as client JavaScript. Below `lg` the column
 * is hidden and `FilterDrawer` presents the same panel in a modal instead — the split
 * `Header` and `MobileNav` already use.
 */
export function FilterSidebar(props: FilterSidebarProps) {
  return (
    // A named complementary landmark rather than a heading: the mockup shows no "Filters"
    // title on desktop, and the landmark is what lets a screen reader jump straight here.
    <aside className={styles.sidebar} aria-label="Filters">
      <FilterPanel {...props} />
    </aside>
  );
}
