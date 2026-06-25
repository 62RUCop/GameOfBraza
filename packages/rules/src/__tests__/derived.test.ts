import { describe, expect, it } from "vitest";
import { computeDerived, type RawStats } from "../derived.js";
import { DEFAULT_RULE_CONFIG } from "../config.js";

const cfg = DEFAULT_RULE_CONFIG;

const stats: RawStats = { str: 5, dex: 4, int: 6, spi: 3, end: 7, luc: 5 };

describe("computeDerived", () => {
  it("computes maxes from base stats with default config", () => {
    const derived = computeDerived(stats, {}, cfg);
    expect(derived).toEqual({
      hpMax: 5 * cfg.hpPerStr, // 5 × 4 = 20
      manaMax: 3 * cfg.manaPerSpi, // 3 × 10 = 30
      apMax: 7 * cfg.apPerEnd, // 7 × 10 = 70
      slots: 6, // = int
      critBonus: Math.floor(5 / cfg.lucCritStep), // floor(5/2) = 2
    });
  });

  it("adds flat bonuses to hp/mana/ap maxes", () => {
    const derived = computeDerived(stats, { hp: 10, mana: 5, ap: 1 }, cfg);
    expect(derived.hpMax).toBe(5 * cfg.hpPerStr + 10);
    expect(derived.manaMax).toBe(3 * cfg.manaPerSpi + 5);
    expect(derived.apMax).toBe(7 * cfg.apPerEnd + 1);
  });

  it("treats missing bonuses as 0", () => {
    const derived = computeDerived(stats, { hp: 4 }, cfg);
    expect(derived.hpMax).toBe(5 * cfg.hpPerStr + 4);
    expect(derived.manaMax).toBe(3 * cfg.manaPerSpi); // no mana bonus
    expect(derived.apMax).toBe(7 * cfg.apPerEnd); // no ap bonus
  });

  it("floors critBonus at each LUC step boundary", () => {
    // lucCritStep = 2 by default
    expect(computeDerived({ ...stats, luc: 0 }, {}, cfg).critBonus).toBe(0);
    expect(computeDerived({ ...stats, luc: 1 }, {}, cfg).critBonus).toBe(0);
    expect(computeDerived({ ...stats, luc: 2 }, {}, cfg).critBonus).toBe(1);
    expect(computeDerived({ ...stats, luc: 3 }, {}, cfg).critBonus).toBe(1);
    expect(computeDerived({ ...stats, luc: 4 }, {}, cfg).critBonus).toBe(2);
  });

  it("slots track INT directly", () => {
    expect(computeDerived({ ...stats, int: 0 }, {}, cfg).slots).toBe(0);
    expect(computeDerived({ ...stats, int: 12 }, {}, cfg).slots).toBe(12);
  });

  it("does not clamp negative stats — derived maxes can go negative (golden rule 1)", () => {
    const derived = computeDerived({ ...stats, str: -2 }, {}, cfg);
    expect(derived.hpMax).toBe(-2 * cfg.hpPerStr); // −8
  });
});
