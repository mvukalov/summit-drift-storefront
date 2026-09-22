"use client";

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { SHOPIFY_API_URL, SHOPIFY_HEADERS } from "./config";

// Browser cache is reserved for live client data (cart, predictive search).
// Catalog data comes from Server Components as props.
function makeClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ uri: SHOPIFY_API_URL, headers: SHOPIFY_HEADERS }),
  });
}

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
