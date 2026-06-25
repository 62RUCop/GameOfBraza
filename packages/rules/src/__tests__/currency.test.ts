import { describe, expect, it, test } from "vitest";
import { formatCurrency, toBronze, type CurrencyDisplay } from "../currency.js";
import { DEFAULT_RULE_CONFIG } from "../config.js";

const cfg = DEFAULT_RULE_CONFIG; // 1 gold = 10 silver = 100 bronze

describe("formatCurrency", () => {
  test.each<[number, CurrencyDisplay]>([
    [0, { gold: 0, silver: 0, bronze: 0 }],
    [7, { gold: 0, silver: 0, bronze: 7 }],
    [10, { gold: 0, silver: 1, bronze: 0 }],
    [99, { gold: 0, silver: 9, bronze: 9 }],
    [100, { gold: 1, silver: 0, bronze: 0 }],
    [1234, { gold: 12, silver: 3, bronze: 4 }],
  ])("%i bronze → denominations", (bronze, expected) => {
    expect(formatCurrency(bronze, cfg)).toEqual(expected);
  });
});

describe("toBronze", () => {
  it("converts denominations back to normalized bronze", () => {
    expect(toBronze({ gold: 12, silver: 3, bronze: 4 }, cfg)).toBe(1234);
    expect(toBronze({ gold: 0, silver: 0, bronze: 0 }, cfg)).toBe(0);
    expect(toBronze({ gold: 1, silver: 0, bronze: 0 }, cfg)).toBe(100);
  });

  it("round-trips with formatCurrency for arbitrary integer amounts", () => {
    for (const amount of [0, 5, 10, 100, 999, 1234, 54321]) {
      expect(toBronze(formatCurrency(amount, cfg), cfg)).toBe(amount);
    }
  });
});
