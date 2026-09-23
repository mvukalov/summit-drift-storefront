// The catalog names its colors `slate`, `moss`, `clay`, `charcoal`, `sand`, `fern` and
// `stone` (project overview §2). None of those are CSS colors, so a facet swatch needs a
// lookup to draw its dot.
//
// These hex values are catalog data, not design decisions: they describe what the product
// looks like, so they do not belong in `tokens.scss` and a component may not hard-code
// them. They are handed to the stylesheet as a custom property, the same exception the
// `Swatch` atom already makes.
//
// The map is deliberately not exhaustive over the API: an unknown value returns `null` and
// the UI falls back to the text label alone, which is the accessible baseline anyway (§8 —
// color is never the only signal).

const CATALOG_COLORS: Record<string, string> = {
  slate: "#333a45",
  moss: "#4f5d3a",
  clay: "#b5623f",
  charcoal: "#3b3f45",
  sand: "#d9c8a8",
  fern: "#5b7247",
  stone: "#a9a292",
};

/** The axis whose values name a color; every other axis is textual (`size`, `material`). */
const COLOR_AXIS = "color";

/** True for the option axis whose values should be drawn with a color dot. */
export function isColorAxis(name: string): boolean {
  return name.toLowerCase() === COLOR_AXIS;
}

/** The CSS color for a catalog color value, or `null` when the value is not a known color. */
export function toCssColor(value: string): string | null {
  return CATALOG_COLORS[value.toLowerCase()] ?? null;
}
