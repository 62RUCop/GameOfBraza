import { prisma } from "@gob/db";
import { computeDerived } from "@gob/rules";
import { canEditCharacter, type Actor, type Result } from "./actor";
import { loadRuleConfig } from "./rule-config";
import {
  activeCharacterWhere,
  RESOURCE_CURRENT_FIELD,
  resourceMax,
  statBlockOf,
  type RuntimeResource,
} from "./character-internal";

export type { RuntimeResource } from "./character-internal";

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

/** Результат правки ресурса: было/стало + эффективный максимум для пометки «вне рамок». */
export interface AdjustResult {
  resource: RuntimeResource;
  previous: number;
  current: number;
  max: number;
}

/**
 * Изменить текущее значение ресурса (HP/мана/ОД) на дельту у активного персонажа актора
 * (самый свежий не-NPC-лист владельца — тот же, что показывает `/me`).
 *
 * § золотое правило 1: БЕЗ clamp — оверхил и отрицательные значения допустимы. Аудит не пишем,
 * как и веб-экшен `updateRuntimeValues`: живые боевые значения не логируем (иначе шум).
 * Инкремент атомарный (`{ increment }`), без read-modify-write гонки.
 */
export async function adjustRuntimeResource(
  actor: Actor,
  resource: RuntimeResource,
  delta: number,
): Promise<AdjustResult | { error: string }> {
  const character = await prisma.character.findFirst({
    where: activeCharacterWhere(actor),
    orderBy: { updatedAt: "desc" },
    include: { attributes: true, runtimeState: true },
  });
  if (!character) return { error: "У тебя пока нет персонажа на сайте." };
  if (!canEditCharacter(actor, character)) return { error: "Нет прав на этот лист." };
  if (!character.runtimeState) return { error: "У персонажа нет рантайм-состояния." };

  const field = RESOURCE_CURRENT_FIELD[resource];
  const previous = character.runtimeState[field];

  const data =
    resource === "hp"
      ? { currentHp: { increment: delta } }
      : resource === "mana"
        ? { currentMana: { increment: delta } }
        : { currentAp: { increment: delta } };
  const updated = await prisma.runtimeState.update({
    where: { characterId: character.id },
    data,
    select: { currentHp: true, currentMana: true, currentAp: true },
  });
  const current = updated[field];

  const ruleConfig = await loadRuleConfig();
  const derived = computeDerived(statBlockOf(character.attributes), {}, ruleConfig);
  const max = resourceMax(resource, character.runtimeState, derived);

  return { resource, previous, current, max };
}
