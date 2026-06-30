import type { BubbleState } from "./types";
import type { RuleConfig } from "./config";

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

/** Исход броска Бабла по зарядам (§3.7, форма по зарядам для `/roll BBL`). */
export interface BubbleRollResult {
  /** Бабл спал в этом бою. */
  fell: boolean;
  /** Порог сохранения в процентах: `min(100, charges × bubbleChargePercent)`. */
  threshold: number;
  /** Заряды после броска: `0` при падении, иначе `max(1, charges − 1)`. */
  nextCharges: number;
}

/**
 * Резолв броска Бабла по числу зарядов (§3.7, уточнение заказчика по `/roll BBL`).
 * d100Roll: 1–100 (выпавшее значение передаётся снаружи — функция чистая).
 *
 * - Порог сохранения = `min(100, charges × bubbleChargePercent)` (та же шкала, что
 *   `bubblePersistChance`).
 * - Бабл спал, если `d100 ≥ порог` (натуральная 100 → всегда спадает, т.к. порог ≤ 100).
 * - Если устоял — заряды уменьшаются на 1, но не ниже 1 (заказчик: «не меньше 1»; вместе с
 *   индикатором «дух ≥ 6 → не остаётся на 0» это держит постоянный Бабл).
 * - Если спал — заряды обнуляются (Бабл больше не работает в текущем бою).
 *
 * Примечание: `resolveBubbleHit` выше — прежняя форма §3.7 по полю `persist_chance` (порог
 * сохранения хранится отдельно, граница `>`); здесь форма по зарядам с границей `≥`.
 */
export function resolveBubbleRoll(
  charges: number,
  d100Roll: number,
  config: RuleConfig,
): BubbleRollResult {
  const threshold = bubblePersistChance(charges, config);
  const fell = d100Roll >= threshold;
  return {
    fell,
    threshold,
    nextCharges: fell ? 0 : Math.max(1, charges - 1),
  };
}
