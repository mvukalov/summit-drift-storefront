/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query Collections {\n  collections(first: 250) {\n    nodes {\n      ...CollectionSummary\n    }\n  }\n}\n\nquery CollectionByHandle($handle: String!) {\n  collection(handle: $handle) {\n    ...CollectionSummary\n    products(first: 250) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n}": typeof types.CollectionsDocument,
    "fragment Money on MoneyV2 {\n  amount\n  currencyCode\n}\n\nfragment Image on Image {\n  url\n  altText\n  width\n  height\n}\n\nfragment CollectionSummary on Collection {\n  handle\n  title\n  description\n  image {\n    ...Image\n  }\n}\n\nfragment ProductCard on Product {\n  handle\n  title\n  featuredImage {\n    ...Image\n  }\n  priceRange {\n    minVariantPrice {\n      ...Money\n    }\n  }\n  compareAtPriceRange {\n    minVariantPrice {\n      ...Money\n    }\n    maxVariantPrice {\n      ...Money\n    }\n  }\n}": typeof types.MoneyFragmentDoc,
};
const documents: Documents = {
    "query Collections {\n  collections(first: 250) {\n    nodes {\n      ...CollectionSummary\n    }\n  }\n}\n\nquery CollectionByHandle($handle: String!) {\n  collection(handle: $handle) {\n    ...CollectionSummary\n    products(first: 250) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n}": types.CollectionsDocument,
    "fragment Money on MoneyV2 {\n  amount\n  currencyCode\n}\n\nfragment Image on Image {\n  url\n  altText\n  width\n  height\n}\n\nfragment CollectionSummary on Collection {\n  handle\n  title\n  description\n  image {\n    ...Image\n  }\n}\n\nfragment ProductCard on Product {\n  handle\n  title\n  featuredImage {\n    ...Image\n  }\n  priceRange {\n    minVariantPrice {\n      ...Money\n    }\n  }\n  compareAtPriceRange {\n    minVariantPrice {\n      ...Money\n    }\n    maxVariantPrice {\n      ...Money\n    }\n  }\n}": types.MoneyFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Collections {\n  collections(first: 250) {\n    nodes {\n      ...CollectionSummary\n    }\n  }\n}\n\nquery CollectionByHandle($handle: String!) {\n  collection(handle: $handle) {\n    ...CollectionSummary\n    products(first: 250) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n}"): (typeof documents)["query Collections {\n  collections(first: 250) {\n    nodes {\n      ...CollectionSummary\n    }\n  }\n}\n\nquery CollectionByHandle($handle: String!) {\n  collection(handle: $handle) {\n    ...CollectionSummary\n    products(first: 250) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment Money on MoneyV2 {\n  amount\n  currencyCode\n}\n\nfragment Image on Image {\n  url\n  altText\n  width\n  height\n}\n\nfragment CollectionSummary on Collection {\n  handle\n  title\n  description\n  image {\n    ...Image\n  }\n}\n\nfragment ProductCard on Product {\n  handle\n  title\n  featuredImage {\n    ...Image\n  }\n  priceRange {\n    minVariantPrice {\n      ...Money\n    }\n  }\n  compareAtPriceRange {\n    minVariantPrice {\n      ...Money\n    }\n    maxVariantPrice {\n      ...Money\n    }\n  }\n}"): (typeof documents)["fragment Money on MoneyV2 {\n  amount\n  currencyCode\n}\n\nfragment Image on Image {\n  url\n  altText\n  width\n  height\n}\n\nfragment CollectionSummary on Collection {\n  handle\n  title\n  description\n  image {\n    ...Image\n  }\n}\n\nfragment ProductCard on Product {\n  handle\n  title\n  featuredImage {\n    ...Image\n  }\n  priceRange {\n    minVariantPrice {\n      ...Money\n    }\n  }\n  compareAtPriceRange {\n    minVariantPrice {\n      ...Money\n    }\n    maxVariantPrice {\n      ...Money\n    }\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;