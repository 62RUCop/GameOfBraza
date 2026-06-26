import { prisma } from "@gob/db";
import { RuleConfigSchema, type RuleConfig } from "@gob/rules";

export async function loadRuleConfig(): Promise<RuleConfig> {
  const rows = await prisma.ruleConfig.findMany();
  const obj = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return RuleConfigSchema.parse(obj);
}
