export interface JsonLdProps {
  /** A schema.org object; serialized as-is into the script tag. */
  data: Record<string, unknown>;
}

/**
 * The one place structured data is serialized into the page. `<` is escaped so text from
 * the API can never close the script tag (`</script>` in a product description would end
 * the block and turn the rest into markup). `<` is valid JSON and parses back to `<`.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // Sanitized above: the only escape hatch for structured data (coding standards §Security).
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
