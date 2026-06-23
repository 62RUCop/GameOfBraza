import type { Bronze } from "./types";
import type { RuleConfig } from "./config";

export interface CurrencyDisplay {
  gold: number;
  silver: number;
  bronze: number;
}

/**
 * Format normalized bronze amount into display denominations (§3.8).
 */
export function formatCurrency(
  bronze: Bronze,
  config: RuleConfig,
): CurrencyDisplay {
  const bronzePerGold = config.goldToSilver * config.silverToBronze;
  const gold = Math.floor(bronze / bronzePerGold);
  const remainder = bronze % bronzePerGold;
  const silver = Math.floor(remainder / config.silverToBronze);
  const bronzeCoins = remainder % config.silverToBronze;
  return { gold, silver, bronze: bronzeCoins };
}

/**
 * Convert display denominations to normalized bronze.
 */
export function toBronze(
  display: CurrencyDisplay,
  config: RuleConfig,
): Bronze {
  return (
    display.gold * config.goldToSilver * config.silverToBronze +
    display.silver * config.silverToBronze +
    display.bronze
  );
}
