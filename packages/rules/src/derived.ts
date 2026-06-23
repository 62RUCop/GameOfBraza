import type { DerivedStats, StatValue } from "./types";
import type { RuleConfig } from "./config";

export interface RawStats {
  str: StatValue;
  dex: StatValue;
  int: StatValue;
  spi: StatValue;
  end: StatValue;
  luc: StatValue;
}

/**
 * Compute suggested derived stats from base stats (§3.1).
 * These are *suggestions* — actual stored values may differ via manual_override.
 */
export function computeDerived(
  stats: RawStats,
  bonuses: { hp?: number; mana?: number; ap?: number },
  config: RuleConfig,
): DerivedStats {
  return {
    hpMax: stats.str * config.hpPerStr + (bonuses.hp ?? 0),
    manaMax: stats.spi * config.manaPerSpi + (bonuses.mana ?? 0),
    apMax: stats.end * config.apPerEnd + (bonuses.ap ?? 0),
    slots: stats.int,
    critBonus: Math.floor(stats.luc / config.lucCritStep),
  };
}
