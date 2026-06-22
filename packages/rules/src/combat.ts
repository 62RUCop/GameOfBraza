/**
 * Hit check (§3.4 step 1).
 * Returns whether the roll hits, crits, or critically fails.
 */
export function checkHit(
  roll: number,
  dieFaces: number,
  dex: number,
): { hit: boolean; crit: boolean; critFail: boolean } {
  const threshold = dieFaces - 1 - dex;
  return {
    hit: roll >= threshold,
    crit: roll === dieFaces,
    critFail: roll === 1,
  };
}

export interface WeaponCard {
  scalingAttribute: number; // actual stat value (STR or DEX)
  weaponCoefficient: number; // e.g. 0.5 for one-hand STR
  damageDiceRolls: number[]; // results of damage dice rolls
  bonusCritDiceRolls: number[]; // extra crit dice (some DEX weapons)
  critMultiplier?: number; // default 2
}

/**
 * Compute damage (§3.4 step 2).
 * Pass pre-rolled dice values — this function is pure.
 */
export function computeDamage(weapon: WeaponCard, isCrit: boolean): number {
  const { scalingAttribute, weaponCoefficient, damageDiceRolls, bonusCritDiceRolls } = weapon;
  const mult = weapon.critMultiplier ?? 2;

  const base = Math.floor(scalingAttribute * weaponCoefficient);
  const diceSum = damageDiceRolls.reduce((a, b) => a + b, 0);

  if (!isCrit) return base + diceSum;

  const critDiceSum = bonusCritDiceRolls.reduce((a, b) => a + b, 0);
  return base + diceSum * mult + critDiceSum;
}
