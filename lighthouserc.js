const PORT = 3200;
const BASE_URL = "http://127.0.0.1:" + PORT;

// `/` is the only route with a measured regression (docs/performance.md); Collection and
// Product are included opportunistically, per the spec, using the same handles e2e already
// exercises (e2e/collection-and-facets.spec.ts, e2e/product-page.spec.ts).
const URLS = [
  BASE_URL + "/",
  BASE_URL + "/collections/summit-protection-shells",
  BASE_URL + "/products/waterproof-wading-jacket-with-breathable-shell",
];

// Thresholds are set from the measured baseline in `docs/performance.md`, not the project's
// aspirational targets (Performance >= 90, LCP < 2.5s) — those are documented but not yet met
// (see `docs/cart.md`'s own measurements). Some headroom is added above the local median because
// GitHub-hosted runners are slower and noisier than the machine these numbers were measured on.
module.exports = {
  ci: {
    collect: {
      url: URLS,
      startServerCommand: "npm run build && npm run start -- --port " + PORT,
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 60000,
      numberOfRuns: 5,
      settings: {
        formFactor: "mobile",
        screenEmulation: { mobile: true, disabled: false },
        throttlingMethod: "simulate",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 4000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
