import { expect, test } from "@playwright/test";

// Two option axes (color: slate/moss/clay, size: XS-L), verified against the live catalog
// (project-overview.md §2).
const PRODUCT_PATH = "/products/waterproof-wading-jacket-with-breathable-shell";

test.describe("Product page", () => {
  test("switching color and size updates the selection and the URL together", async ({ page }) => {
    await page.goto(PRODUCT_PATH);

    // `.click()`, not `.check()`: selecting a value pushes a URL and re-renders the whole
    // picker (VariantPicker.tsx), which replaces the DOM node `.check()`'s own post-condition
    // would otherwise poll on.
    await page.getByRole("radio", { name: "Moss" }).click();
    await expect(page).toHaveURL(/[?&]color=moss/);
    await expect(page.getByRole("radio", { name: "Moss" })).toBeChecked();

    await page.getByRole("radio", { name: "M", exact: true }).click();
    await expect(page).toHaveURL(/[?&]size=M/);
    await expect(page).toHaveURL(/[?&]color=moss/);
    await expect(page.getByRole("radio", { name: "M", exact: true })).toBeChecked();
  });

  test("a direct link with a variant pre-selected renders that selection on load", async ({
    page,
  }) => {
    await page.goto(`${PRODUCT_PATH}?color=clay&size=L`);

    await expect(page.getByRole("radio", { name: "Clay" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "L", exact: true })).toBeChecked();
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
  });
});
