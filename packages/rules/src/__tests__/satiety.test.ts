import { describe, expect, it, test } from "vitest";
import { satietyMin, satietyMax, locationTransitionDamage } from "../satiety.js";

describe("satietyMin", () => {
  it("is the negative of HP max (§3.6)", () => {
    expect(satietyMin(20)).toBe(-20);
    // hpMax 0 → min 0 (negation yields JS signed −0, numerically equal to 0)
    expect(Object.is(satietyMin(0), -0)).toBe(true);
  });
});

describe("satietyMax", () => {
  it("is STR + END (§3.6)", () => {
    expect(satietyMax(5, 7)).toBe(12);
    expect(satietyMax(0, 0)).toBe(0);
  });
});

describe("locationTransitionDamage", () => {
  test.each([
    [5, 0], // positive satiety → no damage
    [0, 0], // exactly zero → no damage (only strictly negative hurts)
    [-1, 1],
    [-12, 12],
  ])("satiety %i → %i damage on crossing a location boundary", (satiety, expected) => {
    expect(locationTransitionDamage(satiety)).toBe(expected);
  });
});
