import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  // Committed; refreshed with `npm run codegen:schema`, so codegen needs no network.
  schema: "schema.graphql",
  documents: ["src/lib/graphql/documents/**/*.graphql"],
  ignoreNoDocuments: false,
  generates: {
    "src/lib/graphql/generated/": {
      preset: "client",
      // Mappers in src/lib already decouple components from GraphQL types.
      presetConfig: { fragmentMasking: false },
      config: {
        useTypeImports: true,
        strictScalars: true,
        // Apollo adds __typename to every selection set except the root, so the
        // types (and the fixtures built from real responses) match what it receives.
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
        scalars: {
          Color: "string",
          DateTime: "string",
          Decimal: "string",
          HTML: "string",
          ISO8601DateTime: "string",
          JSON: "unknown",
          URL: "string",
          UnsignedInt64: "string",
        },
      },
    },
  },
};

export default config;
