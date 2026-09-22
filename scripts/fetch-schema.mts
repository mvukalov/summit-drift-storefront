// Refreshes the committed `schema.graphql` from the live API.
// Run manually with `npm run codegen:schema`; codegen and CI read the local file.
import { writeFile } from "node:fs/promises";
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type IntrospectionQuery,
} from "graphql";
import { SHOPIFY_API_URL, SHOPIFY_HEADERS } from "../src/lib/graphql/config.ts";

const OUTPUT_FILE = new URL("../schema.graphql", import.meta.url);

const response = await fetch(SHOPIFY_API_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...SHOPIFY_HEADERS },
  body: JSON.stringify({ query: getIntrospectionQuery() }),
});

if (!response.ok) {
  throw new Error(`Introspection failed: HTTP ${response.status}`);
}

const result = (await response.json()) as {
  data?: IntrospectionQuery;
  errors?: unknown[];
};

if (!result.data || result.errors) {
  throw new Error(`Introspection returned errors: ${JSON.stringify(result.errors)}`);
}

const schema = buildClientSchema(result.data);
await writeFile(OUTPUT_FILE, `${printSchema(schema)}\n`);

process.stdout.write(`Wrote schema.graphql (${Object.keys(schema.getTypeMap()).length} types)\n`);
