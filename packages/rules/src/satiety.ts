/**
 * Satiety bounds (§3.6).
 */
export function satietyMin(hpMax: number): number {
  return -hpMax;
}

export function satietyMax(str: number, end: number): number {
  return str + end;
}

/**
 * Damage taken when crossing a location boundary with negative satiety (§3.6).
 */
export function locationTransitionDamage(satiety: number): number {
  return satiety < 0 ? Math.abs(satiety) : 0;
}
