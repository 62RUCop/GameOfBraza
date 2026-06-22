import { describe, expect, it } from "vitest";
import { attributePowerTier, classIndex, TIER_TO_DIE } from "../tiers.js";
import { DEFAULT_RULE_CONFIG } from "../config.js";

describe("TIER_TO_DIE", () => {
  it("maps tier 0 to d4 and tier 5 to d100", () => {
    expect(TIER_TO_DIE[0]).toBe(4);
    expect(TIER_TO_DIE[5]).toBe(100);
  });
});

describe("attributePowerTier", () => {
  it("returns 0 for values below 3", () => {
    expect(attributePowerTier(0)).toBe(0);
    expect(attributePowerTier(2)).toBe(0);
  });

  it("returns 1 for value 3–5", () => {
    expect(attributePowerTier(3)).toBe(1);
    expect(attributePowerTier(5)).toBe(1);
  });

  it("returns 2 for value 6–8", () => {
    expect(attributePowerTier(6)).toBe(2);
    expect(attributePowerTier(8)).toBe(2);
  });

  it("returns 3 for value 9–11", () => {
    expect(attributePowerTier(9)).toBe(3);
    expect(attributePowerTier(11)).toBe(3);
  });

  it("returns 4 for value 12 and is capped at 4 for 255", () => {
    expect(attributePowerTier(12)).toBe(4);
    expect(attributePowerTier(255)).toBe(4);
  });
});

describe("classIndex", () => {
  const thresholds = DEFAULT_RULE_CONFIG.classThresholds;

  it("returns -1 below first threshold", () => {
    expect(classIndex(0, thresholds)).toBe(-1);
    expect(classIndex(5, thresholds)).toBe(-1);
  });

  it("returns 0 at threshold 6", () => {
    expect(classIndex(6, thresholds)).toBe(0);
    expect(classIndex(8, thresholds)).toBe(0);
  });

  it("returns 1 at threshold 9", () => {
    expect(classIndex(9, thresholds)).toBe(1);
    expect(classIndex(11, thresholds)).toBe(1);
  });

  it("returns 2 at threshold 12, stays 2 up to 19", () => {
    expect(classIndex(12, thresholds)).toBe(2);
    expect(classIndex(19, thresholds)).toBe(2);
  });

  it("returns 3 at threshold 20, stays 3 at 255", () => {
    expect(classIndex(20, thresholds)).toBe(3);
    expect(classIndex(255, thresholds)).toBe(3);
  });
});
