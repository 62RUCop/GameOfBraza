/**
 * Hit check (§3.4 step 1).
 * Returns whether the roll hits, crits, or critically fails.
 *
 * - hit:  roll ≥ dieFaces − 1 − dex
 * - crit: roll ≥ dieFaces − critBonus  (critBonus 0 → только натуральный максимум, как §3.4;
 *         каждый пункт крит-модификатора удачи опускает порог на 1 грань)
 * - critFail: натуральная 1 (§3.4 — либо попадание по союзнику)
 *
 * `crit` НЕ зависит от `hit`: при высоком крит-модификаторе и низком DEX порог крита может
 * оказаться ниже порога попадания, и тогда `crit && !hit` — это «критический промах»
 * (его выводит вызывающий). Без clamp (§ золотое правило 1): высокий DEX опускает порог
 * попадания ниже 1, и даже натуральная 1 попадает.
 */
export function checkHit(
  roll: number,
  dieFaces: number,
  dex: number,
  critBonus = 0,
): { hit: boolean; crit: boolean; critFail: boolean } {
  return {
    hit: roll >= dieFaces - 1 - dex,
    crit: roll >= dieFaces - critBonus,
    critFail: roll === 1,
  };
}

/**
 * Плоский модификатор урона от характеристики (§3.4): `floor(stat × coefficient)`.
 * Например, силовой одноруч — `0.5 × STR`, силовой двуруч — `1 × STR`,
 * ловкостный одноруч — `0.25 × DEX`, ловкостный двуруч — `0.5 × DEX`.
 * Единый источник: используется и в `computeDamage`, и в `/roll DMG`.
 */
export function scalingDamageBonus(statValue: number, coefficient: number): number {
  return Math.floor(statValue * coefficient);
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

  const base = scalingDamageBonus(scalingAttribute, weaponCoefficient);
  const diceSum = damageDiceRolls.reduce((a, b) => a + b, 0);

  if (!isCrit) return base + diceSum;

  const critDiceSum = bonusCritDiceRolls.reduce((a, b) => a + b, 0);
  return base + diceSum * mult + critDiceSum;
}
