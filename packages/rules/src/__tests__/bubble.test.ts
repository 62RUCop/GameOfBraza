import { describe, expect, it } from "vitest";
import { bubblePersistChance, resolveBubbleHit, resolveBubbleRoll } from "../bubble.js";
import { DEFAULT_RULE_CONFIG } from "../config.js";

const cfg = DEFAULT_RULE_CONFIG;

describe("bubblePersistChance", () => {
  it("is charges × 10, capped at 100", () => {
    expect(bubblePersistChance(3, cfg)).toBe(30);
    expect(bubblePersistChance(10, cfg)).toBe(100);
    expect(bubblePersistChance(15, cfg)).toBe(100);
  });
});

describe("resolveBubbleHit", () => {
  const active = { active: true, charges: 3, persistChance: 30 };

  it("does nothing when bubble is not active", () => {
    const state = { active: false, charges: 3, persistChance: 30 };
    expect(resolveBubbleHit(state, 50, cfg)).toEqual(state);
  });

  it("bubble falls on natural 100", () => {
    const next = resolveBubbleHit(active, 100, cfg);
    expect(next.active).toBe(false);
  });

  it("bubble falls when roll > persistChance", () => {
    const next = resolveBubbleHit(active, 31, cfg);
    expect(next.active).toBe(false);
  });

  it("bubble persists when roll <= persistChance and reduces persist chance", () => {
    const next = resolveBubbleHit(active, 30, cfg);
    expect(next.active).toBe(true);
    expect(next.persistChance).toBe(20);
  });
});

describe("resolveBubbleRoll", () => {
  // 3 заряда → порог 30
  it("спадает, когда d100 ≥ порога (граница входит в падение)", () => {
    expect(resolveBubbleRoll(3, 30, cfg)).toEqual({ fell: true, threshold: 30, nextCharges: 0 });
    expect(resolveBubbleRoll(3, 99, cfg).fell).toBe(true);
  });

  it("устаивает, когда d100 < порога, и тратит заряд (min 1)", () => {
    expect(resolveBubbleRoll(3, 29, cfg)).toEqual({ fell: false, threshold: 30, nextCharges: 2 });
  });

  it("при устоявшем бабле заряды не опускаются ниже 1", () => {
    expect(resolveBubbleRoll(1, 5, cfg)).toEqual({ fell: false, threshold: 10, nextCharges: 1 });
  });

  it("порог ограничен 100: при ≥10 зарядах спадает только на натуральной 100", () => {
    expect(resolveBubbleRoll(10, 99, cfg).fell).toBe(false);
    expect(resolveBubbleRoll(10, 100, cfg).fell).toBe(true);
    expect(resolveBubbleRoll(15, 100, cfg)).toEqual({ fell: true, threshold: 100, nextCharges: 0 });
  });

  it("0 зарядов → порог 0 → спадает при любом броске", () => {
    expect(resolveBubbleRoll(0, 1, cfg).fell).toBe(true);
  });
});
