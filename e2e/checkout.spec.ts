import { expect, test, type Page } from "@playwright/test";

// A fully-resolved variant, so "Add to cart" is enabled without extra clicks.
const PRODUCT_PATH = "/products/waterproof-wading-jacket-with-breathable-shell?color=moss&size=M";
const PRODUCT_TITLE = "Waterproof Wading Jacket With Breathable Shell";

/** Server Actions POST with a `next-action` header (see cart.spec.ts). */
function waitForCartAction(page: Page) {
  return page.waitForResponse(
    (response) => response.request().headers()["next-action"] !== undefined,
  );
}

async function addLine(page: Page) {
  await page.goto(PRODUCT_PATH);
  await Promise.all([
    waitForCartAction(page),
    page.getByRole("button", { name: "Add to cart" }).click(),
  ]);
  const drawer = page.getByRole("dialog", { name: "Your cart" });
  await expect(drawer).toBeVisible();
  return drawer;
}

// The empty-state copy is shared with the (closed) cart drawer, which stays in the DOM, so
// text queries are scoped to <main>. Role queries already skip the closed <dialog>.
test.describe("Checkout", () => {
  test("drawer → /checkout on this site, summary, place order, empty cart", async ({ page }) => {
    const drawer = await addLine(page);
    const drawerSubtotal = await drawer.getByText("Subtotal").locator("..").textContent();

    await drawer.getByRole("link", { name: "Checkout" }).click();

    // Same origin, never mock.shop's hosted checkout.
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:\d+\/checkout$/);
    await expect(drawer).toBeHidden();

    const summary = page.getByRole("region", { name: "Order summary" });
    await expect(summary.getByRole("listitem")).toHaveCount(1);
    await expect(summary.getByRole("listitem")).toContainText(PRODUCT_TITLE);
    await expect(summary.getByRole("listitem")).toContainText("Quantity 1");
    // The total is the drawer's subtotal: same cart, same number.
    const total = summary.getByText("Total").locator("..");
    await expect(total).toHaveText(drawerSubtotal!.replace("Subtotal", "Total"));

    await Promise.all([
      waitForCartAction(page),
      page.getByRole("button", { name: "Place order" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "Order placed" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Cart, 0 items" })).toBeVisible();

    // Emptied on the server, not just in this tab's state.
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Cart, 0 items" })).toBeVisible();
    await page.goto("/checkout");
    await expect(page.getByRole("main").getByText("Your cart is empty.")).toBeVisible();
  });

  test("with no cart, /checkout shows the empty state rather than a summary", async ({ page }) => {
    await page.goto("/checkout");

    await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Your cart is empty.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue shopping" })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(page.getByRole("button", { name: "Place order" })).toHaveCount(0);
  });
});
