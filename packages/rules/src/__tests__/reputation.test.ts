import { describe, expect, it, test } from "vitest";
import { reputationLabel, reputationPriceMultiplier } from "../reputation.js";
import type { ReputationLabel } from "../types.js";

describe("reputationLabel", () => {
  // Spec §3.9 bands on the −10…+10 scale.
  test.each<[number, ReputationLabel]>([
    [-11, "international_manhunt"], // below the floor still reads as the worst band
    [-10, "international_manhunt"],
    [-9, "villain"],
    [-7, "villain"],
    [-6, "known_negative"],
    [-4, "known_negative"],
    [-3, "stranger"],
    [0, "stranger"],
    [3, "stranger"],
    [4, "known_positive"],
    [6, "known_positive"],
    [7, "hero"],
    [9, "hero"],
    [10, "legend"],
    [11, "legend"], // above the ceiling still reads as the best band
  ])("value %i → %s", (value, expected) => {
    expect(reputationLabel(value)).toBe(expected);
  });
});

describe("reputationPriceMultiplier", () => {
  // [hostile, negative, neutral, positive]
  const ranged = [1.5, 1.0, 0.75, 0.5] as const;

  test.each([
    [-5, ranged[0]], // hostile band (≤ −4)
    [-4, ranged[0]],
    [-3, ranged[1]], // negative band (−3…−1)
    [-1, ranged[1]],
    [0, ranged[2]], // neutral band (0…6)
    [6, ranged[2]],
    [7, ranged[3]], // positive band (≥ 7)
    [10, ranged[3]],
  ])("value %i → multiplier %f", (value, expected) => {
    expect(reputationPriceMultiplier(value, ranged)).toBe(expected);
  });

  it("uses the caller-supplied curve (per-category, not global)", () => {
    const defaultCurve = [1.5, 1.0, 0.5, 0.25] as const;
    expect(reputationPriceMultiplier(0, defaultCurve)).toBe(0.5);
    expect(reputationPriceMultiplier(10, defaultCurve)).toBe(0.25);
  });
});
