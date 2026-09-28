import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PRODUCT_PATH = "/products/waterproof-wading-jacket-with-breathable-shell?color=moss&size=M";

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

/**
 * The project's bar (§9, and every feature's manual "axe 0 violations" runs): zero serious or
 * critical violations. Moderate/minor findings are not gated here — same threshold as every
 * prior feature's browser check, now asserted in CI instead of by hand.
 */
async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test.describe("Accessibility", () => {
  for (const [name, viewport] of [
    ["desktop", DESKTOP_VIEWPORT],
    ["mobile", MOBILE_VIEWPORT],
  ] as const) {
    test.describe(name, () => {
      test.use({ viewport });

      test("home", async ({ page }) => {
        await page.goto("/");
        await expectNoSeriousViolations(page);
      });

      test("collection (default)", async ({ page }) => {
        await page.goto("/collections/summit-protection-shells");
        await expectNoSeriousViolations(page);
      });

      test("collection (no results after filtering)", async ({ page }) => {
        // A price band with no product in it — verified against the live API (2026-09-27):
        // this collection's variant prices jump from $27.50 to $75, so $40-60 matches none.
        // (An out-of-span range would just be dropped by `clampPrice`, not filter to zero.)
        await page.goto("/collections/summit-protection-shells?price=40-60");
        await expectNoSeriousViolations(page);
      });

      test("product page", async ({ page }) => {
        await page.goto(PRODUCT_PATH);
        await expectNoSeriousViolations(page);
      });

      test("search (no query)", async ({ page }) => {
        await page.goto("/search");
        await expectNoSeriousViolations(page);
      });

      test("search (results)", async ({ page }) => {
        await page.goto("/search?q=a");
        await expectNoSeriousViolations(page);
      });

      test("search (no results)", async ({ page }) => {
        await page.goto("/search?q=jaket");
        await expectNoSeriousViolations(page);
      });

      test("search combobox open", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("combobox", { name: "Search products" }).fill("jacket");
        await expect(page.getByRole("option").first()).toBeVisible();
        await expectNoSeriousViolations(page);
      });

      test("cart drawer open and empty", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: /^Cart,/ }).click();
        await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();
        await expectNoSeriousViolations(page);
      });

      test("cart drawer open with a line", async ({ page }) => {
        await page.goto(PRODUCT_PATH);
        await page.getByRole("button", { name: "Add to cart" }).click();
        await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();
        await expectNoSeriousViolations(page);
      });

      test("checkout (empty)", async ({ page }) => {
        await page.goto("/checkout");
        await expect(page.getByRole("main").getByText("Your cart is empty.")).toBeVisible();
        await expectNoSeriousViolations(page);
      });

      test("checkout (summary) and confirmation", async ({ page }) => {
        await page.goto(PRODUCT_PATH);
        // Wait for the add to land, so the line on /checkout is a real one, not optimistic.
        await Promise.all([
          page.waitForResponse(
            (response) => response.request().headers()["next-action"] !== undefined,
          ),
          page.getByRole("button", { name: "Add to cart" }).click(),
        ]);
        await page
          .getByRole("dialog", { name: "Your cart" })
          .getByRole("link", { name: "Checkout" })
          .click();
        await expect(page.getByRole("region", { name: "Order summary" })).toBeVisible();
        await expectNoSeriousViolations(page);

        await page.getByRole("button", { name: "Place order" }).click();
        await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
        await expectNoSeriousViolations(page);
      });
    });
  }

  // Desktop-only: the filter sidebar is only visible from lg (1280px); below that,
  // `FilterDrawer`'s mobile dialog is the interactive surface instead (checked next).
  test("collection with facets applied (desktop sidebar)", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto("/collections/summit-protection-shells?color=moss&sort=price-asc");
    await expectNoSeriousViolations(page);
  });

  // Mobile-only: the filter drawer is the interactive surface below lg.
  test("filter drawer open (mobile)", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/collections/summit-protection-shells");
    await page.getByRole("button", { name: /^Filters/ }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
