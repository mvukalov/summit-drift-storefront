import { describe, expect, it } from "vitest";
import { isColorAxis, toCssColor } from "./colors";

describe("isColorAxis", () => {
  it.each(["color", "Color", "COLOR"])("recognises %s whatever the API's casing", (name) => {
    expect(isColorAxis(name)).toBe(true);
  });

  it.each(["size", "material", "finish", "colour"])("leaves %s textual", (name) => {
    expect(isColorAxis(name)).toBe(false);
  });
});

describe("toCssColor", () => {
  it.each([
    ["slate", "#333a45"],
    ["moss", "#4f5d3a"],
    ["clay", "#b5623f"],
    ["charcoal", "#3b3f45"],
    ["sand", "#d9c8a8"],
    ["fern", "#5b7247"],
    ["stone", "#a9a292"],
  ])("maps the catalog's %s to a CSS color", (value, expected) => {
    expect(toCssColor(value)).toBe(expected);
  });

  it("matches whatever casing the API sends", () => {
    expect(toCssColor("Moss")).toBe("#4f5d3a");
  });

  // The UI then shows the text label alone, which is the accessible baseline anyway.
  it("returns null for a value it does not know", () => {
    expect(toCssColor("ultraviolet")).toBeNull();
  });
});
