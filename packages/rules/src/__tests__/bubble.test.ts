import { describe, expect, it } from "vitest";
import { bubblePersistChance, resolveBubbleHit } from "../bubble.js";
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
