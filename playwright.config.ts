import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  // One Chromium project at desktop width, matching every prior feature's "verified manually in
  // Chromium" precedent (no multi-browser requirement in the spec). `a11y.spec.ts` switches
  // viewport per test (`test.use({ viewport })`) to also cover the 375px checks already done
  // manually per feature, instead of doubling every functional flow spec at both widths.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --port " + PORT,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
