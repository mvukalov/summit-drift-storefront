import { expect, test } from "@playwright/test";

const COLLECTION_PATH = "/collections/summit-protection-shells";

test.describe("Collection page and facets", () => {
  test("applying a facet and a sort updates the URL and the grid, and survives a reload", async ({
    page,
  }) => {
    await page.goto(COLLECTION_PATH);

    // The result count is the toolbar's `aria-live="polite"` paragraph (CollectionToolbar.tsx).
    // Tag-scoped: the page also has an empty `<div role="status" aria-live="polite">` (Next's
    // own route announcer).
    const count = page.locator('p[aria-live="polite"]');
    await expect(count).toHaveText(/\d+ products?/);

    // Apply a color facet from the desktop sidebar (this project runs at 1280px). `.click()`,
    // not `.check()`: choosing a facet pushes a URL and re-renders the panel (FilterPanel.tsx),
    // which replaces the DOM node `.check()`'s own post-condition would otherwise poll on.
    await page.getByRole("checkbox", { name: "Moss" }).click();
    await expect(page).toHaveURL(/[?&]color=moss/);

    // Apply a sort.
    await page.getByLabel("Sort:").selectOption("price-asc");
    await expect(page).toHaveURL(/[?&]sort=price-asc/);
    await expect(page).toHaveURL(/[?&]color=moss/);

    const filteredCount = await count.innerText();

    // The chip for the applied facet is visible.
    await expect(page.getByRole("button", { name: /Moss, remove filter/ })).toBeVisible();

    const urlAfterFilters = page.url();

    await page.reload();

    // State renders from the URL alone: same URL, same checkbox/sort state, same count.
    expect(page.url()).toBe(urlAfterFilters);
    await expect(page.getByRole("checkbox", { name: "Moss" })).toBeChecked();
    await expect(page.getByLabel("Sort:")).toHaveValue("price-asc");
    await expect(count).toHaveText(filteredCount);
  });

  test("clearing all filters returns to the unfiltered collection", async ({ page }) => {
    await page.goto(`${COLLECTION_PATH}?color=moss`);

    await expect(page.getByRole("checkbox", { name: "Moss" })).toBeChecked();

    await page.getByRole("button", { name: "Clear all" }).click();

    await expect(page).toHaveURL(COLLECTION_PATH);
    await expect(page.getByRole("checkbox", { name: "Moss" })).not.toBeChecked();
  });
});
