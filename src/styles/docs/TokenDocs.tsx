// Doc blocks for the Storybook "Design Tokens" page. Values are read from the live
// CSS custom properties, so tokens.scss stays the single source of truth.
// Inline `style` is the documented exception here: each sample renders the token
// named in its data, which a static class can't express. Not for app components.
import styles from "./TokenDocs.module.scss";

interface TokenListProps {
  tokens: readonly string[];
}

function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// "0.25rem" → "0.25rem · 4px"; other values pass through unchanged.
function formatSize(value: string): string {
  const rem = /^(\d*\.?\d+)rem$/.exec(value);
  if (!rem?.[1]) return value;
  const amount = Number(rem[1]);
  return `${amount}rem · ${amount * 16}px`;
}

export function ColorSwatches({ tokens }: TokenListProps) {
  return (
    <ul className={styles.swatchGrid}>
      {tokens.map((token) => {
        const value = readToken(token);
        return (
          <li key={token} className={styles.swatch}>
            <span className={styles.swatchChip} style={{ background: `var(${token})` }} />
            <code className={styles.tokenName}>{token}</code>
            <span className={styles.tokenValue}>{value.toUpperCase()}</span>
          </li>
        );
      })}
    </ul>
  );
}

interface TypeSample {
  label: string;
  token: string;
  font: "heading" | "body";
  weight?: string;
}

interface TypeScaleProps {
  samples: readonly TypeSample[];
}

export function TypeScale({ samples }: TypeScaleProps) {
  return (
    <ul className={styles.list}>
      {samples.map(({ label, token, font, weight }) => (
        <li key={token} className={styles.typeRow}>
          <span
            className={styles.typeSample}
            style={{
              fontFamily: `var(--font-${font})`,
              fontSize: `var(${token})`,
              fontWeight: weight ? `var(${weight})` : undefined,
            }}
          >
            {label}
          </span>
          <code className={styles.tokenName}>{token}</code>
          <span className={styles.tokenValue}>{formatSize(readToken(token))}</span>
        </li>
      ))}
    </ul>
  );
}

export function SpacingScale({ tokens }: TokenListProps) {
  return (
    <ul className={styles.list}>
      {tokens.map((token) => (
        <li key={token} className={styles.scaleRow}>
          <code className={styles.tokenName}>{token}</code>
          <span className={styles.tokenValue}>{formatSize(readToken(token))}</span>
          <span className={styles.spacingBar} style={{ width: `var(${token})` }} />
        </li>
      ))}
    </ul>
  );
}

export function RadiusScale({ tokens }: TokenListProps) {
  return (
    <ul className={styles.boxGrid}>
      {tokens.map((token) => (
        <li key={token} className={styles.boxItem}>
          <span className={styles.radiusBox} style={{ borderRadius: `var(${token})` }} />
          <code className={styles.tokenName}>{token}</code>
          <span className={styles.tokenValue}>{formatSize(readToken(token))}</span>
        </li>
      ))}
    </ul>
  );
}

export function ShadowScale({ tokens }: TokenListProps) {
  return (
    <ul className={styles.boxGrid}>
      {tokens.map((token) => (
        <li key={token} className={styles.boxItem}>
          <span className={styles.shadowBox} style={{ boxShadow: `var(${token})` }} />
          <code className={styles.tokenName}>{token}</code>
        </li>
      ))}
    </ul>
  );
}
