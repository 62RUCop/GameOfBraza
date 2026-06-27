import { prisma } from "@gob/db";
import { canEditCharacter, type Actor, type Result } from "./actor";

/** Текущие рантайм-значения, которые правит игрок прямо в бою (HP/мана/ОД/сытость/бабл). */
export interface RuntimeCurrentValues {
  currentHp?: number;
  currentMana?: number;
  currentAp?: number;
  satietyCurrent?: number;
  bubbleActive?: boolean;
  bubbleCharges?: number;
}

/**
 * Записать текущие значения рантайма как есть.
 *
 * § золотое правило 1: НЕ зажимаем (no clamp). Оверхил, отрицательные значения и выход за
 * расчётный максимум допустимы — это нейтральная подсветка «в игре что-то произошло», а не
 * ошибка. Поэтому здесь нет ни валидации диапазона, ни сравнения с *Computed/*Override.
 */
export async function updateRuntimeCurrentValues(
  actor: Actor,
  characterId: string,
  values: RuntimeCurrentValues,
): Promise<Result> {
  const character = await prisma.character.findFirst({
    where: { id: characterId, deletedAt: null },
    select: { ownerId: true },
  });
  if (!character) return { error: "Персонаж не найден" };
  if (!canEditCharacter(actor, character)) return { error: "Нет прав" };

  await prisma.runtimeState.update({ where: { characterId }, data: values });
  return { ok: true };
}
