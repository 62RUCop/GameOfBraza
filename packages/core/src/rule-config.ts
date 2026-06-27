import { prisma } from "@gob/db";
import { RuleConfigSchema, type RuleConfig } from "@gob/rules";

/**
 * Загрузка `RuleConfig` из БД (строки key/value JSON → Zod-валидированный объект).
 * Общая для веба и бота: оба клиента берут константы формул из одного источника,
 * а не хардкодят их (§ золотое правило 2).
 */
export async function loadRuleConfig(): Promise<RuleConfig> {
  const rows = await prisma.ruleConfig.findMany();
  const obj = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return RuleConfigSchema.parse(obj);
}
