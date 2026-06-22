import { z } from "zod";

export const StatBonusesSchema = z.object({
  hp: z.number().optional(),
  dodge: z.number().optional(),
  armor: z.number().optional(),
  bubble_chance_pct: z.number().optional(),
}).strict();

export type StatBonuses = z.infer<typeof StatBonusesSchema>;
