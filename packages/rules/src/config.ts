import { z } from "zod";

export const RuleConfigSchema = z.object({
  // Stat → derived formulas
  hpPerStr: z.number().default(4),
  manaPerSpi: z.number().default(10),
  apPerEnd: z.number().default(10),

  // Crit threshold: every N LUC reduces required roll by 1
  lucCritStep: z.number().default(2),

  // Class bonus thresholds {6,9,12,20} — configurable for future balance tweaks
  classThresholds: z.array(z.number()).length(4).default([6, 9, 12, 20]),

  // Bubble
  bubbleChargePercent: z.number().default(10), // persist_chance = charges × this

  // Currency
  silverToBronze: z.number().default(10),
  goldToSilver: z.number().default(10),

  // Reputation price multipliers per category (4 values: hostile→friendly)
  reputationPriceMultipliers: z.record(
    z.string(),
    z.tuple([z.number(), z.number(), z.number(), z.number()]),
  ).default({
    ranged: [1.5, 1.0, 0.75, 0.5],
    default: [1.5, 1.0, 0.5, 0.25],
  }),
});

export type RuleConfig = z.infer<typeof RuleConfigSchema>;

export const DEFAULT_RULE_CONFIG: RuleConfig = RuleConfigSchema.parse({});
