import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats a whole amount with two decimals", () => {
    expect(formatMoney({ amount: "249.0", currencyCode: "USD" })).toBe("$249.00");
  });

  it("formats a fractional amount", () => {
    expect(formatMoney({ amount: "323.7", currencyCode: "USD" })).toBe("$323.70");
  });

  it("formats zero", () => {
    expect(formatMoney({ amount: "0.0", currencyCode: "USD" })).toBe("$0.00");
  });

  it("adds grouping separators to large amounts", () => {
    expect(formatMoney({ amount: "1234.5", currencyCode: "USD" })).toBe("$1,234.50");
  });

  it("uses the currency from the money value, not a hard-coded one", () => {
    expect(formatMoney({ amount: "19.99", currencyCode: "EUR" })).toBe("€19.99");
    expect(formatMoney({ amount: "19.99", currencyCode: "GBP" })).toBe("£19.99");
  });

  it("follows the currency's own minor units", () => {
    expect(formatMoney({ amount: "1500.0", currencyCode: "JPY" })).toBe("¥1,500");
  });
});
