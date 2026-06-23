import type { StatValue, Tier } from "./types";

/**
 * Tier → die face mapping (§3.2)
 */
export const TIER_TO_DIE: Record<Tier, number> = {
  0: 4,
  1: 6,
  2: 12,
  3: 20,
  4: 60,
  5: 100,
};

/**
 * attribute_power_tier: stat value → max allowed item/skill tier (§3.3)
 * Capped at 4 regardless of stat value.
 */
export function attributePowerTier(value: StatValue): Tier {
  if (value < 3) return 0;
  return Math.min(4, Math.floor((value - 3) / 3) + 1) as Tier;
}

/**
 * classIndex: stat value → class index 0–3, or -1 if below first threshold (§3.5)
 * Thresholds must be sorted ascending, length 4.
 */
export function classIndex(
  value: StatValue,
  thresholds: readonly number[],
): number {
  let idx = -1;
  for (let i = 0; i < thresholds.length; i++) {
    const threshold = thresholds[i];
    if (threshold !== undefined && value >= threshold) idx = i;
  }
  return idx;
}

