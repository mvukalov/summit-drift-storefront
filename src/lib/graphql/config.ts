// Public, non-secret values: mock.shop has no private token, so no env variables.
export const SHOPIFY_API_URL = "https://apparel-outdoor.mock.shop/api";

export const SHOPIFY_HEADERS = {
  "X-Shopify-Storefront-Access-Token": "public",
} as const;

// How long catalog responses stay in the Next.js data cache.
export const REVALIDATE_SECONDS = 3600;

export const CACHE_TAGS = {
  catalog: "catalog",
} as const;
