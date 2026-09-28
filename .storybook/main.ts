import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  viteFinal(config, { configType }) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // The cart actions are a `"use server"` module backed by the RSC-only Apollo client,
      // which cannot be imported into a browser bundle. Stories render the cart UI against a
      // no-op stand-in instead.
      "@/lib/cart/actions": fileURLToPath(
        new URL("../src/test/cart-actions.browser.ts", import.meta.url),
      ),
    };
    // Only the deployed build lives under a GitHub Pages project subpath; `storybook dev`
    // always serves from the local root, so this must not apply there (see
    // docs/storybook-deploy.md).
    if (configType === "PRODUCTION" && process.env.STORYBOOK_BASE_PATH) {
      config.base = process.env.STORYBOOK_BASE_PATH;
    }
    return config;
  },
};

export default config;
