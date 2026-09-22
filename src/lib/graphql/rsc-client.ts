import "server-only";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { CACHE_TAGS, REVALIDATE_SECONDS, SHOPIFY_API_URL, SHOPIFY_HEADERS } from "./config";

export function makeRscClient(): ApolloClient {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: SHOPIFY_API_URL,
      headers: SHOPIFY_HEADERS,
      // Catalog data is cached in the Next.js data cache (POST included).
      // Override per operation with `context: { fetchOptions }`, e.g. `cache: "no-store"` for the cart.
      fetchOptions: {
        cache: "force-cache",
        next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAGS.catalog] },
      },
    }),
  });
}

// One client per RSC request.
export const { getClient, query } = registerApolloClient(makeRscClient);
