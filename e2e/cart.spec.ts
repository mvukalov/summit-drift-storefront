import { expect, test, type Page } from "@playwright/test";

// A fully-resolved variant, so "Add to cart" is enabled without extra clicks.
const PRODUCT_PATH = "/products/waterproof-wading-jacket-with-breathable-shell?color=moss&size=M";
const PRODUCT_TITLE = "Waterproof Wading Jacket With Breathable Shell";

/** Server Actions POST with a `next-action` header; waiting for it is the deterministic way
 * to know a cart mutation has actually reached the server, not just painted optimistically. */
function waitForCartAction(page: Page) {
  return page.waitForResponse(
    (response) => response.request().headers()["next-action"] !== undefined,
  );
}

test.describe("Cart", () => {
  test("add, update quantity and remove, in one session", async ({ page }) => {
    await page.goto(PRODUCT_PATH);

    await Promise.all([
      waitForCartAction(page),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);

    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer).toBeVisible();
    // `.first()`: the title also appears a second time, visually hidden, inside the "Remove"
    // button's accessible name (CartDrawer.tsx).
    await expect(drawer.getByText(PRODUCT_TITLE).first()).toBeVisible();
    await expect(drawer.getByLabel(`Quantity for ${PRODUCT_TITLE}`)).toHaveValue("1");

    await Promise.all([
      waitForCartAction(page),
      drawer.getByRole("button", { name: "Increase quantity" }).click(),
    ]);
    await expect(drawer.getByLabel(`Quantity for ${PRODUCT_TITLE}`)).toHaveValue("2");

    await Promise.all([
      waitForCartAction(page),
      drawer.getByRole("button", { name: `Remove ${PRODUCT_TITLE}` }).click(),
    ]);
    await expect(drawer.getByText("Your cart is empty.")).toBeVisible();
  });

  test("the cart survives a reload", async ({ page }) => {
    await page.goto(PRODUCT_PATH);
    await Promise.all([
      waitForCartAction(page),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);
    await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();

    await page.reload();

    await page.getByRole("button", { name: /^Cart,/ }).click();
    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer.getByText(PRODUCT_TITLE).first()).toBeVisible();
  });

  test("adding the same variant twice merges into one line", async ({ page }) => {
    await page.goto(PRODUCT_PATH);

    await Promise.all([
      waitForCartAction(page),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);
    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Close cart" }).click();

    await Promise.all([
      waitForCartAction(page),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);
    await expect(drawer).toBeVisible();

    await expect(drawer.getByRole("listitem")).toHaveCount(1);
    await expect(drawer.getByLabel(`Quantity for ${PRODUCT_TITLE}`)).toHaveValue("2");
  });

  test("the header count is correct in the raw server-rendered HTML", async ({ page }) => {
    await page.goto(PRODUCT_PATH);
    await Promise.all([
      waitForCartAction(page),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);
    await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();

    // `page.request` runs no JavaScript, so this is the actual first-response HTML — proof the
    // count is server-rendered, not hydrated in. The cookie is `Secure` in this production
    // build (cookie.ts); the browser sends it over plain HTTP to 127.0.0.1 under the
    // "localhost is a secure context" exception, but `page.request`'s own cookie jar does not
    // extend that exception, so the cookie is attached explicitly here instead of relying on it.
    const cartCookie = (await page.context().cookies()).find((cookie) => cookie.name === "cart_id");
    const response = await page.request.get("/", {
      headers: cartCookie ? { Cookie: `cart_id=${cartCookie.value}` } : {},
    });
    const html = await response.text();
    expect(html).toContain('aria-label="Cart, 1 item"');
  });

  test("opening the drawer moves focus into it; Escape closes it and returns focus", async ({
    page,
  }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /^Cart,/ });
    await trigger.click();

    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer).toBeVisible();
    // Native `showModal()` focus behaviour: with no `autofocus` element present, focus goes to
    // the first focusable node in tree order — here the title `<h2 tabIndex={-1}>`, ahead of
    // the Close button (jsdom cannot exercise this, which is why it was deferred to this
    // feature — docs/cart.md). Verified against the real browser, not assumed from the spec.
    await expect(drawer.getByRole("heading", { name: "Your cart" })).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("a per-line ceiling refusal makes no request and leaves the quantity unchanged", async ({
    page,
  }) => {
    await page.goto(PRODUCT_PATH);

    // `getByRole("spinbutton", ...)`, not `getByLabel`: "Quantity" is also a substring of the
    // stepper's own "Decrease/Increase quantity" button labels (QuantityStepper.tsx).
    await page.getByRole("spinbutton", { name: "Quantity" }).fill("10");
    await Promise.all([
      waitForCartAction(page),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);
    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer.getByLabel(`Quantity for ${PRODUCT_TITLE}`)).toHaveValue("10");
    await drawer.getByRole("button", { name: "Close cart" }).click();

    const cartActionRequests: string[] = [];
    page.on("request", (request) => {
      if (request.headers()["next-action"] !== undefined) cartActionRequests.push(request.url());
    });

    await page.getByRole("button", { name: "Add to cart" }).click();

    // Not `getByRole("alert")`: Next's own route announcer is also `role="alert"` on every page.
    await expect(page.getByText("You can have at most 10 of this item in the cart.")).toBeVisible();
    // Give a would-be (wrong) request time to show up before asserting none did.
    await page.waitForTimeout(300);
    expect(cartActionRequests).toEqual([]);
    await expect(drawer).toBeHidden();
  });
});
