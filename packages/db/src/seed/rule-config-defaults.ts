import type { PrismaClient } from "@prisma/client";
import { DEFAULT_RULE_CONFIG } from "@gob/rules";

/** Upsert all RuleConfig keys from DEFAULT_RULE_CONFIG. */
export async function seedRuleConfig(prisma: PrismaClient) {
  const entries = Object.entries(DEFAULT_RULE_CONFIG) as [string, unknown][];
  for (const [key, value] of entries) {
    await prisma.ruleConfig.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
  }
  console.log(`[seed] RuleConfig: ${entries.length} keys upserted`);
}
