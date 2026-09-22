import type { MenuItemFragment } from "@/lib/graphql/generated/graphql";

// Domain type for site navigation, derived from the generated GraphQL types.
// `href` is a site-relative path, never the API's absolute storefront URL.

export type MenuItem = Pick<MenuItemFragment, "title"> & {
  href: string;
};
