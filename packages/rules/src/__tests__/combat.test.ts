import { describe, expect, it, test } from "vitest";
import { checkHit, computeDamage, scalingDamageBonus, type WeaponCard } from "../combat.js";

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

  it("critBonus default 0 → crit only on the natural max (backward compatible)", () => {
    expect(checkHit(19, 20, 3, 0).crit).toBe(false);
    expect(checkHit(20, 20, 3, 0).crit).toBe(true);
  });

  it("crit threshold lowers by 1 per critBonus point (dieFaces − critBonus)", () => {
    // d20, critBonus 1 → crit threshold = 20 − 1 = 19, so 19 and 20 crit
    expect(checkHit(18, 20, 3, 1).crit).toBe(false);
    expect(checkHit(19, 20, 3, 1).crit).toBe(true);
    // critBonus 3 → threshold 17
    expect(checkHit(17, 20, 3, 3).crit).toBe(true);
    expect(checkHit(16, 20, 3, 3).crit).toBe(false);
  });

  it("high critBonus + low DEX can crit without hitting (critical miss)", () => {
    // d20, DEX 0 → hit threshold = 19; critBonus 5 → crit threshold = 15
    // roll 16: crit (≥15) but not a hit (<19) → caller renders «критический промах»
    const r = checkHit(16, 20, 0, 5);
    expect(r.crit).toBe(true);
    expect(r.hit).toBe(false);
  });
});

describe("scalingDamageBonus", () => {
  it("floors stat × coefficient", () => {
    expect(scalingDamageBonus(10, 1)).toBe(10); // силовой двуруч 1×STR
    expect(scalingDamageBonus(10, 0.5)).toBe(5); // силовой одноруч 0.5×STR
    expect(scalingDamageBonus(7, 0.25)).toBe(1); // ловкостный одноруч floor(1.75)=1
    expect(scalingDamageBonus(9, 0.5)).toBe(4); // floor(4.5)=4
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
