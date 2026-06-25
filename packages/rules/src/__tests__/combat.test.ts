import { describe, expect, it, test } from "vitest";
import { checkHit, computeDamage, type WeaponCard } from "../combat.js";

describe("checkHit", () => {
  // d20 (dieFaces=20), DEX=3 → threshold = 20 − 1 − 3 = 16
  test.each([
    [15, false],
    [16, true],
    [17, true],
    [19, true],
  ])("d20, DEX 3, roll %i → hit %s", (roll, expected) => {
    expect(checkHit(roll, 20, 3).hit).toBe(expected);
  });

  it("natural max face is a crit (and a hit)", () => {
    expect(checkHit(20, 20, 3)).toEqual({ hit: true, crit: true, critFail: false });
  });

  it("natural 1 is a crit-fail", () => {
    expect(checkHit(1, 20, 3)).toEqual({ hit: false, crit: false, critFail: true });
  });

  it("crit only triggers on the exact max face, not above the threshold", () => {
    expect(checkHit(19, 20, 3).crit).toBe(false);
  });

  it("does not clamp: very high DEX lowers the threshold below 1, so even a natural 1 hits", () => {
    // threshold = 20 − 1 − 20 = −1, so any roll ≥ −1 hits
    const result = checkHit(1, 20, 20);
    expect(result.hit).toBe(true);
    expect(result.critFail).toBe(true); // still a natural 1
  });

  it("threshold scales with die faces (d4)", () => {
    // d4, DEX 0 → threshold = 4 − 1 − 0 = 3
    expect(checkHit(2, 4, 0).hit).toBe(false);
    expect(checkHit(3, 4, 0).hit).toBe(true);
    expect(checkHit(4, 4, 0)).toEqual({ hit: true, crit: true, critFail: false });
  });
});

describe("computeDamage", () => {
  const base: WeaponCard = {
    scalingAttribute: 10,
    weaponCoefficient: 0.5,
    damageDiceRolls: [3, 4],
    bonusCritDiceRolls: [],
  };

  it("normal hit: floor(stat × coeff) + sum(dice)", () => {
    // floor(10 × 0.5) + (3 + 4) = 5 + 7 = 12
    expect(computeDamage(base, false)).toBe(12);
  });

  it("crit doubles the dice sum by default (×2)", () => {
    // 5 + 7 × 2 = 19
    expect(computeDamage(base, true)).toBe(19);
  });

  it("crit adds bonus crit dice on top of the doubled dice", () => {
    // 5 + 7 × 2 + (2 + 1) = 19 + 3 = 22
    const weapon: WeaponCard = { ...base, bonusCritDiceRolls: [2, 1] };
    expect(computeDamage(weapon, true)).toBe(22);
  });

  it("bonus crit dice are ignored on a normal (non-crit) hit", () => {
    const weapon: WeaponCard = { ...base, bonusCritDiceRolls: [2, 1] };
    expect(computeDamage(weapon, false)).toBe(12);
  });

  it("honors a custom critMultiplier", () => {
    // 5 + 7 × 3 = 26
    const weapon: WeaponCard = { ...base, critMultiplier: 3 };
    expect(computeDamage(weapon, true)).toBe(26);
  });

  it("floors the scaling part (0.25 × DEX)", () => {
    // floor(7 × 0.25) = floor(1.75) = 1
    const weapon: WeaponCard = {
      scalingAttribute: 7,
      weaponCoefficient: 0.25,
      damageDiceRolls: [2],
      bonusCritDiceRolls: [],
    };
    expect(computeDamage(weapon, false)).toBe(1 + 2);
  });

  it("handles empty dice arrays (pure scaling damage)", () => {
    const weapon: WeaponCard = {
      scalingAttribute: 12,
      weaponCoefficient: 1,
      damageDiceRolls: [],
      bonusCritDiceRolls: [],
    };
    expect(computeDamage(weapon, false)).toBe(12);
    expect(computeDamage(weapon, true)).toBe(12); // 12 + 0×2 + 0
  });
});
