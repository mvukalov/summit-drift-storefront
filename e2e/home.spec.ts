import { expect, test } from "@playwright/test";

test.describe("Home", () => {
  test("renders the hero, collections and featured products", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Scoped to the section: the footer repeats an "Collections" heading of its own.
    const collectionsSection = page.locator("#collections");
    await expect(collectionsSection.getByRole("heading", { name: "Collections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Featured" })).toBeVisible();

    // Four collection tiles, per the catalog (project-overview.md §2). Scoped to the
    // collections section: the header nav repeats the same link text.
    await expect(
      collectionsSection.getByRole("link", { name: "Summit Protection Shells" }),
    ).toBeVisible();
  });

  test("a collection tile navigates to that collection", async ({ page }) => {
    await page.goto("/");

    await page
      .locator("#collections")
      .getByRole("link", { name: "Summit Protection Shells" })
      .click();

    await expect(page).toHaveURL("/collections/summit-protection-shells");
    await expect(
      page.getByRole("heading", { name: "Summit Protection Shells", level: 1 }),
    ).toBeVisible();
  });

  test("a featured product card navigates to that product", async ({ page }) => {
    await page.goto("/");

    const featuredSection = page.locator("section", {
      has: page.getByRole("heading", { name: "Featured" }),
    });
    const firstCard = featuredSection.getByRole("article").first();
    const title = await firstCard.getByRole("heading", { level: 3 }).innerText();

    await firstCard.getByRole("link").click();

    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  });
});
