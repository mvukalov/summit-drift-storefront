import { describe, expect, it } from "vitest";
import { formatOptionName, formatOptionValue } from "./options";

describe("formatOptionName", () => {
  // The four axes this catalog actually uses.
  it.each([
    ["color", "Color"],
    ["size", "Size"],
    ["material", "Material"],
    ["finish", "Finish"],
  ])("formats %s as %s", (name, expected) => {
    expect(formatOptionName(name)).toBe(expected);
  });

  it("splits a hyphenated name into words", () => {
    expect(formatOptionName("shell-material")).toBe("Shell Material");
  });

  it("leaves an already-capitalized name alone", () => {
    expect(formatOptionName("Color")).toBe("Color");
  });

  it("returns an empty string for an empty name", () => {
    expect(formatOptionName("")).toBe("");
  });
});

describe("formatOptionValue", () => {
  it.each([
    ["moss", "Moss"],
    ["charcoal", "Charcoal"],
    ["nylon-blend", "Nylon Blend"],
    ["weather-resistant", "Weather Resistant"],
    ["extra-large", "Extra Large"],
  ])("title-cases %s as %s", (value, expected) => {
    expect(formatOptionValue(value)).toBe(expected);
  });

  // Title-casing these would produce "Xs" and "M " — sizes are shown exactly as the API has them.
  it.each(["XS", "S", "M", "L", "XL", "30", "32", "36"])("leaves %s verbatim", (value) => {
    expect(formatOptionValue(value)).toBe(value);
  });

  it("collapses repeated separators", () => {
    expect(formatOptionValue("soft  shell")).toBe("Soft Shell");
  });

  it("returns an empty string for an empty value", () => {
    expect(formatOptionValue("")).toBe("");
  });
});
