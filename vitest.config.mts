import { fileURLToPath } from "node:url";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  // Next.js resolves `server-only` itself; tests use an empty stub.
  "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        // Components and pure logic. The `browser` condition loads the browser build
        // of @apollo/client-integration-nextjs (its SSR build throws outside the App Router).
        resolve: { alias, conditions: ["browser", ...defaultClientConditions] },
        test: {
          name: "client",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.server.test.ts"],
        },
      },
      {
        // Server-only modules (RSC Apollo client, fetchers) against MSW. The `react-server`
        // condition loads the RSC build, the only one that exports `registerApolloClient`.
        // Node tests run in Vite's SSR environment, so the condition goes under `ssr`.
        resolve: { alias },
        ssr: { resolve: { conditions: ["react-server", ...defaultServerConditions] } },
        test: {
          name: "server",
          environment: "node",
          setupFiles: ["./src/test/setup-server.ts"],
          include: ["src/**/*.server.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/lib/graphql/generated/**"],
      thresholds: {
        "src/lib/**": {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
});
