// Captured from https://apparel-outdoor.mock.shop/api on 2026-09-22: the real response to the
// document Apollo sends (__typename added to every selection set except the root).
import type { MainMenuQuery } from "@/lib/graphql/generated/graphql";

export const mainMenuFixture = {
  menu: {
    items: [
      {
        title: "Home",
        type: "FRONTPAGE",
        url: "https://apparel-outdoor.hydrogen.mock.shop/",
        __typename: "MenuItem",
      },
      {
        title: "Summit Protection Shells",
        type: "COLLECTION",
        url: "https://apparel-outdoor.hydrogen.mock.shop/collections/summit-protection-shells",
        __typename: "MenuItem",
      },
      {
        title: "Trail Foundation Layers",
        type: "COLLECTION",
        url: "https://apparel-outdoor.hydrogen.mock.shop/collections/trail-foundation-layers",
        __typename: "MenuItem",
      },
      {
        title: "Rugged Traverse Bottoms",
        type: "COLLECTION",
        url: "https://apparel-outdoor.hydrogen.mock.shop/collections/rugged-traverse-bottoms",
        __typename: "MenuItem",
      },
      {
        title: "Expedition Field Gear",
        type: "COLLECTION",
        url: "https://apparel-outdoor.hydrogen.mock.shop/collections/expedition-field-gear",
        __typename: "MenuItem",
      },
    ],
    __typename: "Menu",
  },
} satisfies MainMenuQuery;
