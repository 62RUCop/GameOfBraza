import type { ReputationLabel, ReputationValue } from "./types";

/**
 * Map a reputation value to its display label (§3.9).
 */
export function reputationLabel(value: ReputationValue): ReputationLabel {
  if (value <= -10) return "international_manhunt";
  if (value <= -7) return "villain";
  if (value <= -4) return "known_negative";
  if (value <= 3) return "stranger";
  if (value <= 6) return "known_positive";
  if (value <= 9) return "hero";
  return "legend";
}

/**
 * Price multiplier for a given reputation value and category (§3.9).
 * multipliers: [hostile, negative, neutral, positive] — indices map to reputation bands.
 */
export function reputationPriceMultiplier(
  value: ReputationValue,
  multipliers: readonly [number, number, number, number],
): number {
  if (value <= -4) return multipliers[0];
  if (value <= -1) return multipliers[1];
  if (value <= 6) return multipliers[2];
  return multipliers[3];
}
