import { describe, expect, it } from "vitest";
import { DEFAULT_RULE_CONFIG, RuleConfigSchema } from "../config.js";

describe("RuleConfigSchema", () => {
  it("fills documented defaults when parsing an empty object", () => {
    expect(DEFAULT_RULE_CONFIG).toMatchObject({
      hpPerStr: 4,
      manaPerSpi: 10,
      apPerEnd: 10,
      lucCritStep: 2,
      classThresholds: [6, 9, 12, 20],
      bubbleChargePercent: 10,
      silverToBronze: 10,
      goldToSilver: 10,
    });
  });

  it("ships the per-category reputation price curves", () => {
    expect(DEFAULT_RULE_CONFIG.reputationPriceMultipliers).toEqual({
      ranged: [1.5, 1.0, 0.75, 0.5],
      default: [1.5, 1.0, 0.5, 0.25],
    });
  });

  it("rejects a classThresholds array that is not exactly 4 long", () => {
    expect(() => RuleConfigSchema.parse({ classThresholds: [6, 9, 12] })).toThrow();
    expect(() => RuleConfigSchema.parse({ classThresholds: [6, 9, 12, 20, 30] })).toThrow();
  });

  it("accepts overrides for tweaking balance", () => {
    const parsed = RuleConfigSchema.parse({ hpPerStr: 5, classThresholds: [5, 8, 11, 18] });
    expect(parsed.hpPerStr).toBe(5);
    expect(parsed.classThresholds).toEqual([5, 8, 11, 18]);
    expect(parsed.manaPerSpi).toBe(10); // untouched defaults remain
  });
});
