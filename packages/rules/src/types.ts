export type Tier = 0 | 1 | 2 | 3 | 4 | 5;

/** 0–255 stat range */
export type StatValue = number;

/** Normalized money in bronze coins */
export type Bronze = number;

/** Reputation −10..+10 */
export type ReputationValue = number;

export interface DerivedStats {
  hpMax: number;
  manaMax: number;
  apMax: number;
  /** Number of skill slots */
  slots: number;
  /** Crit threshold reduction from LUC (flat value subtracted from max die face) */
  critBonus: number;
}

export interface BubbleState {
  active: boolean;
  charges: number;
  persistChance: number; // 0–100 %
}

export type ReputationLabel =
  | "international_manhunt"
  | "villain"
  | "known_negative"
  | "stranger"
  | "known_positive"
  | "hero"
  | "legend";
