import { prisma } from "@gob/db";
import { formatCurrency, type CurrencyDisplay } from "@gob/rules";
import type { Actor } from "./actor";
import { activeCharacterWhere } from "./character-internal";
import { loadRuleConfig } from "./rule-config";

/** Баланс активного листа для бота (`/money`). */
export interface MoneySummary {
  characterId: string;
  characterName: string;
  /** Нормализованный баланс в бронзе (как хранится; может быть дробным). */
  bronze: number;
  /** Разбивка по номиналам через `@gob/rules` (золото/серебро/бронза). */
  display: CurrencyDisplay;
}

/**
 * Баланс активного персонажа актора (тот же лист, что показывает `/me`).
 * Только чтение: разбивка номиналов считается формулой из `@gob/rules` (§ золотое правило 2),
 * курсы (silverToBronze/goldToSilver) берутся из `RuleConfig`, не хардкодом.
 */
export async function getActorMoney(actor: Actor): Promise<MoneySummary | null> {
  const character = await prisma.character.findFirst({
    where: activeCharacterWhere(actor),
    orderBy: { updatedAt: "desc" },
    include: { currency: true },
  });
  if (!character) return null;

  const ruleConfig = await loadRuleConfig();
  // balanceBronze — Prisma.Decimal; в число для формулы/вывода.
  const bronze = character.currency ? Number(character.currency.balanceBronze) : 0;
  const display = formatCurrency(bronze, ruleConfig);

  return { characterId: character.id, characterName: character.name, bronze, display };
}
