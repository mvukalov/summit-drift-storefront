// @vitest-environment node
// Integrity checks for the design tokens. Broken custom properties fail silently in CSS
// (an undefined var() just resolves to nothing), so lint, typecheck and build can't catch them.
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compile } from "sass";
import { describe, expect, it } from "vitest";

const stylesDir = fileURLToPath(new URL(".", import.meta.url));
const css = compile(`${stylesDir}globals.scss`).css;
const docsPage = readFileSync(`${stylesDir}docs/DesignTokens.mdx`, "utf8");
const componentStyles = globSync(`${stylesDir}../components/**/*.module.scss`).map((path) => ({
  path,
  source: readFileSync(path, "utf8"),
}));

// Declared by next/font on <html> (src/styles/fonts.ts), not in tokens.scss.
const EXTERNAL_TOKENS = new Set(["--font-libre-baskerville", "--font-ibm-plex-sans"]);

const declared = new Map(
  [...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name = "", value = ""]) => [
    name,
    value.trim(),
  ]),
);

function referencedTokens(source: string): Set<string> {
  return new Set([...source.matchAll(/var\((--[\w-]+)/g)].map(([, name = ""]) => name));
}

// Follows var() aliases down to the primitive value.
function resolve(name: string): string {
  const value = declared.get(name);
  if (value === undefined) throw new Error(`Unknown token ${name}`);
  const alias = /^var\((--[\w-]+)\)$/.exec(value);
  return alias?.[1] ? resolve(alias[1]) : value;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(resolve(foreground)), luminance(resolve(background))].sort(
    (a, b) => b - a,
  );
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe("design tokens", () => {
  it("defines every token referenced by var() in the global styles", () => {
    const missing = [...referencedTokens(css)].filter(
      (name) => !declared.has(name) && !EXTERNAL_TOKENS.has(name),
    );
    expect(missing).toEqual([]);
  });

  // Component-local custom properties (set by the component itself), not design tokens.
  const LOCAL_PROPERTIES = new Set(["--swatch-color"]);

  it("defines every token referenced by var() in component styles", () => {
    expect(componentStyles.length).toBeGreaterThan(0);
    const missing = componentStyles.flatMap(({ path, source }) =>
      [...referencedTokens(source)]
        .filter((name) => !declared.has(name) && !LOCAL_PROPERTIES.has(name))
        .map((name) => `${name} in ${path.split("/components/")[1]}`),
    );
    expect(missing).toEqual([]);
  });

  it("defines every token shown on the Storybook tokens page", () => {
    const shown = new Set([...docsPage.matchAll(/"(--[\w-]+)"/g)].map(([, name = ""]) => name));
    expect(shown.size).toBeGreaterThan(0);
    expect([...shown].filter((name) => !declared.has(name))).toEqual([]);
  });

  it.each([
    ["--color-text", "--color-background"],
    ["--color-text", "--color-surface"],
    ["--color-text-muted", "--color-background"],
    ["--color-text-muted", "--color-surface"],
    ["--color-text-inverse", "--color-surface-inverse"],
    ["--color-text-inverse-muted", "--color-surface-inverse"],
    ["--color-on-primary", "--color-primary"],
    ["--color-on-primary", "--color-primary-hover"],
    ["--color-accent", "--color-background"],
    ["--color-on-accent", "--color-accent"],
    ["--color-sale", "--color-background"],
    ["--color-on-sale", "--color-sale"],
  ])("%s on %s meets WCAG AA for body text (4.5:1)", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the focus ring at 3:1 against page surfaces (WCAG 1.4.11)", () => {
    expect(contrast("--color-focus-ring", "--color-background")).toBeGreaterThanOrEqual(3);
    expect(contrast("--color-focus-ring", "--color-surface")).toBeGreaterThanOrEqual(3);
    expect(
      contrast("--color-focus-ring-inverse", "--color-surface-inverse"),
    ).toBeGreaterThanOrEqual(3);
  });
});
