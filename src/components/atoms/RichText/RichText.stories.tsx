import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RichText } from "./RichText";

const meta = {
  title: "Atoms/RichText",
  component: RichText,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Renders sanitized `descriptionHtml` from the Storefront API. Takes the raw value " +
          "and sanitizes it internally, so there is no way to render it unsanitized. Only " +
          "`<p>`, `<ul>` and `<li>` survive; `<ol>` is renamed to `<ul>` so list items keep a parent.",
      },
    },
  },
} satisfies Meta<typeof RichText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A real product description from the live API: one paragraph plus three bullets. */
export const ProductDescription: Story = {
  args: {
    html:
      "<p>Early mornings on the river call for a jacket that blocks out the damp without " +
      "weighing you down. This technical shell keeps you dry and moving freely, no matter " +
      "how the weather turns.</p><ul><li>Advanced waterproof membrane shields against " +
      "steady rain and spray</li><li>Strategically placed ventilation panels prevent " +
      "overheating on active treks</li><li>Articulated sleeves and adjustable cuffs " +
      "support complete casting mobility</li></ul>",
  },
};

/** A collection description: a single paragraph, the other shape the API returns. */
export const CollectionDescription: Story = {
  args: {
    html:
      "<p>Weatherproof gear featuring an earthy muted palette, contemplative rugged mood, " +
      "and technical ripstop material language for high-altitude endurance.</p>",
  },
};

/**
 * Tags outside the allowlist are dropped but their text is kept, so richer copy from a
 * real store still reads correctly — it just loses its formatting.
 */
export const UnsupportedMarkupDegrades: Story = {
  args: {
    html:
      "<h2>Fabric</h2><p>A <strong>three-layer</strong> shell with a <em>brushed</em> " +
      'backer. <a href="https://example.com">Read the spec sheet</a>.</p>' +
      "<ol><li>Face fabric</li><li>Membrane</li><li>Backer</li></ol>",
  },
};

/**
 * Hostile input. Nothing here executes or reaches the DOM: the a11y addon runs axe over
 * the result, and the rendered output should contain only the harmless paragraph.
 */
export const HostileInput: Story = {
  args: {
    html:
      "<p>Legitimate copy.</p><script>alert(1)</script>" +
      '<img src=x onerror=alert(1)><p onclick="alert(1)">handler stripped</p>' +
      '<iframe src="https://evil.com"></iframe><svg onload=alert(1)></svg>' +
      '<a href="javascript:alert(1)">inert</a>',
  },
};

/** Empty input renders no wrapper at all, so an empty description leaves no gap. */
export const Empty: Story = {
  args: { html: "" },
};
