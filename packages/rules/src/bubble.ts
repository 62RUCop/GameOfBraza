import type { BubbleState } from "./types.js";
import type { RuleConfig } from "./config.js";

/**
 * Compute current persist_chance from charges (§3.7).
 */
export function bubblePersistChance(
  charges: number,
  config: RuleConfig,
): number {
  return Math.min(100, charges * config.bubbleChargePercent);
}

/**
 * Resolve a bubble hit check (§3.7).
 * d100Roll: 1–100 (pre-rolled, function stays pure).
 * Returns new bubble state.
 */
export function resolveBubbleHit(
  state: BubbleState,
  d100Roll: number,
  config: RuleConfig,
): BubbleState {
  if (!state.active) return state;

  const persistChance = bubblePersistChance(state.charges, config);

  if (d100Roll === 100 || d100Roll > persistChance) {
    return { active: false, charges: state.charges, persistChance: 0 };
  }

  const newPersistChance = Math.max(0, persistChance - config.bubbleChargePercent);
  return { ...state, persistChance: newPersistChance };
}
