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

/**
 * Which concrete types each interface and union in our documents can be.
 *
 * Apollo's normalized cache cannot match a fragment on an interface or union without this:
 * it drops every field it can't attribute, so a cached cart reads back as bare
 * `__typename`s and the drawer renders nothing. The cart documents are the first in this
 * project to select through an abstract type, hence the first need for it.
 *
 * Kept by hand because the list is two entries; if it grows, generate it with codegen's
 * `possibleTypes` output instead of maintaining it here.
 */
export const POSSIBLE_TYPES: Record<string, string[]> = {
  // `Cart.lines` is a BaseCartLineConnection.
  BaseCartLine: ["CartLine", "ComponentizableCartLine"],
  // `CartLine.merchandise` is a union with a single member today.
  Merchandise: ["ProductVariant"],
};
