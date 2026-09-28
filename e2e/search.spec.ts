import { expect, test } from "@playwright/test";

test.describe("Search", () => {
  test("typing, arrowing to a suggestion and pressing Enter lands on that product", async ({
    page,
  }) => {
    await page.goto("/");

    const combobox = page.getByRole("combobox", { name: "Search products" });
    await combobox.fill("jacket");

    const firstOption = page.getByRole("option").first();
    await expect(firstOption).toBeVisible();
    // The option's title is its first <span> (SearchCombobox.tsx); the price that follows is
    // its own nested spans, so `.first()` is the only stable way to isolate it without a
    // test-only hook.
    const title = (await firstOption.locator("span").first().innerText()).trim();

    await combobox.press("ArrowDown");
    await combobox.press("Enter");

    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  });

  test("a no-match term shows the no-results state in the dropdown", async ({ page }) => {
    await page.goto("/");

    const combobox = page.getByRole("combobox", { name: "Search products" });
    await combobox.fill("zzznotarealproductzzz");

    // Scoped to "check the spelling": the visually-hidden live-region announcement also starts
    // with "No results for", but only the visible message includes this phrase (SearchCombobox.tsx).
    await expect(page.getByText(/No results for.*check the spelling/)).toBeVisible();
  });

  test("pressing Enter with nothing highlighted goes to the results page", async ({ page }) => {
    await page.goto("/");

    const combobox = page.getByRole("combobox", { name: "Search products" });
    await combobox.fill("jacket");
    await expect(page.getByRole("option").first()).toBeVisible();

    // Escape dismisses the listbox without clearing the input; Enter then submits the form.
    await combobox.press("Escape");
    await combobox.press("Enter");

    await expect(page).toHaveURL("/search?q=jacket");
    // The heading uses curly quotes (page.tsx): `Results for “jacket”`.
    await expect(
      page.getByRole("heading", { name: "Results for “jacket”", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel("Sort:")).toBeVisible();
  });

  test("results page: no query, results, no-results, sort and pagination", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByText("Type what you're looking for in the search box.")).toBeVisible();

    await page.goto("/search?q=jaket");
    await expect(page.getByText(/No products match/)).toBeVisible();

    // `q=a` matches every product in the catalog (30), so page 1 has 16 and page 2 has 14
    // (paginate() by 16) — a stable way to exercise sort + pagination together.
    await page.goto("/search?q=a");
    await expect(page.getByText(/^30 results$/)).toBeVisible();

    await page.getByLabel("Sort:").selectOption("price-desc");
    await expect(page).toHaveURL("/search?q=a&sort=price-desc");

    await page.getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/search?q=a&sort=price-desc&page=2");
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.getByRole("link", { name: "Previous page" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Next page" })).toHaveCount(0);
  });

  test("every search state is noindex, follow (§5.5) and has no canonical", async ({ page }) => {
    for (const path of ["/search", "/search?q=a", "/search?q=jaket"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, follow",
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    }
  });

  test("a direct link with sort and page renders that exact set", async ({ page }) => {
    await page.goto("/search?q=a&sort=price-asc&page=2");

    await expect(page.getByLabel("Sort:")).toHaveValue("price-asc");
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.getByRole("link", { name: "Previous page" })).toBeVisible();
  });

  test("an out-of-range page and an invalid sort fall back to page 1 and relevance", async ({
    page,
  }) => {
    // No redirect happens — parseSearchParams falls back silently and renders defaults for
    // whatever the address bar holds (src/lib/search/params.ts).
    await page.goto("/search?q=a&sort=bogus&page=-4");

    await expect(page.getByLabel("Sort:")).toHaveValue("relevance");
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
  });
});
