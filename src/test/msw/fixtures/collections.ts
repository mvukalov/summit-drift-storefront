// Captured from https://apparel-outdoor.mock.shop/api on 2026-09-22: the real response to the
// document Apollo sends (__typename added to every selection set except the root).
import type { CollectionsQuery } from "@/lib/graphql/generated/graphql";

export const collectionsFixture = {
  collections: {
    nodes: [
      {
        handle: "summit-protection-shells",
        title: "Summit Protection Shells",
        description:
          "Weatherproof gear featuring an earthy muted palette, contemplative rugged mood, and technical ripstop material language for high-altitude endurance.",
        image: {
          url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/d8ed96bd1d0432d1fa0cfe305622a3bd.png?v=14970910",
          altText: null,
          width: null,
          height: null,
          __typename: "Image",
        },
        __typename: "Collection",
      },
      {
        handle: "trail-foundation-layers",
        title: "Trail Foundation Layers",
        description:
          "Moisture-wicking essentials defined by an earthy muted palette, contemplative rugged mood, and technical ripstop material language for base-layer comfort.",
        image: {
          url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/397c28136fe9eeff79e6bad8d5329065.png?v=13678502",
          altText: null,
          width: null,
          height: null,
          __typename: "Image",
        },
        __typename: "Collection",
      },
      {
        handle: "rugged-traverse-bottoms",
        title: "Rugged Traverse Bottoms",
        description:
          "Durable hiking trousers crafted with an earthy muted palette, contemplative rugged mood, and technical ripstop material language for maximum mobility.",
        image: {
          url: "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/3447b938643f0f1df0e77cbbf9dea9b3.png?v=15046180",
          altText: null,
          width: null,
          height: null,
          __typename: "Image",
        },
        __typename: "Collection",
      },
      {
        handle: "expedition-field-gear",
        title: "Expedition Field Gear",
        description:
          "Essential accessories built with an earthy muted palette, contemplative rugged mood, and technical ripstop material language for campsite utility.",
        image: {
          url: "https://cdn.shopify.com/s/files/1/0926/4031/3366/files/f19b576cc8c845833762194272a822d7.png?v=14626304",
          altText: null,
          width: null,
          height: null,
          __typename: "Image",
        },
        __typename: "Collection",
      },
    ],
    __typename: "CollectionConnection",
  },
} satisfies CollectionsQuery;
