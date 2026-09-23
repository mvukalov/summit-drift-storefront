// The API names option axes in lowercase (`color`, `size`, `material`, `finish`) and its
// values are inconsistently cased: `slate`, `nylon-blend` and `extra-large` sit next to
// `XS`, `S`, `M` and `36` (project overview §2). Display labels are normalized here so the
// facet UI never shows "Xs" or "nylon-blend"; the raw value stays the identity used in
// filtering and in the URL.

const SEPARATORS = /[\s-]+/;

// A value with no lowercase letter is already an abbreviation or a number (`XS`, `L`, `36`).
// Title-casing it would turn `XS` into `Xs`, so it is left exactly as the API sent it.
function isVerbatim(value: string): boolean {
  return !/[a-z]/.test(value);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** `color` → `Color`, `finish` → `Finish`. */
export function formatOptionName(name: string): string {
  return name.split(SEPARATORS).filter(Boolean).map(capitalize).join(" ");
}

/** `moss` → `Moss`, `nylon-blend` → `Nylon Blend`, `XS` → `XS`, `36` → `36`. */
export function formatOptionValue(value: string): string {
  if (isVerbatim(value)) return value;
  return value.split(SEPARATORS).filter(Boolean).map(capitalize).join(" ");
}
