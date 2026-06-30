import { prisma, type StatAttribute } from "@gob/db";
import { bubblePersistChance, computeDerived, resolveBubbleRoll, scalingDamageBonus } from "@gob/rules";
import { canEditCharacter, type Actor } from "./actor";
import { loadRuleConfig } from "./rule-config";
import { activeCharacterWhere, statBlockOf, type StatBlock } from "./character-internal";

/** StatAttribute из БД → ключ `StatBlock`. */
const ATTR_KEY: Record<StatAttribute, keyof StatBlock> = {
  strength: "str",
  dexterity: "dex",
  intelligence: "int",
  spirit: "spi",
  endurance: "end",
  luck: "luc",
};

/** Надетое оружие для `/roll DMG`: характеристика масштабирования + плоский бонус урона. */
export interface WeaponScaling {
  name: string;
  hand: "left" | "right";
  /** Характеристика масштабирования (или `null`, если оружие без масштабирования). */
  attribute: keyof StatBlock | null;
  coefficient: number | null;
  /** Текущее значение характеристики масштабирования. */
  statValue: number | null;
  /** `floor(statValue × coefficient)` — доп. урон от характеристики (§3.4). */
  bonus: number | null;
}

/** Контекст активного листа для бросков (`/roll`): характеристики, крит-модификатор, бабл, оружие. */
export interface RollContext {
  characterId: string;
  characterName: string;
  attributes: StatBlock;
  /** Крит-модификатор удачи: `floor(LUC / lucCritStep)` (§3.4). */
  critBonus: number;
  bubbleActive: boolean;
  bubbleCharges: number;
  weapons: WeaponScaling[];
}

/** Значение из overrides JSON по ключу, если это непустая строка. */
function overrideString(overrides: unknown, key: string): string | null {
  const o = (overrides ?? {}) as Record<string, unknown>;
  const v = o[key];
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Число из overrides JSON (Prisma пишет Decimal строкой) по ключу, иначе `null`. */
function overrideNumber(overrides: unknown, key: string): number | null {
  const o = (overrides ?? {}) as Record<string, unknown>;
  const v = o[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

/** Маппинг строки enum StatAttribute (из шаблона/override) в ключ StatBlock, иначе `null`. */
function attrKeyOf(raw: string | null | undefined): keyof StatBlock | null {
  if (raw == null) return null;
  return (ATTR_KEY as Record<string, keyof StatBlock | undefined>)[raw] ?? null;
}

/**
 * Контекст для `/roll` по активному листу актора (тот же лист, что у `/me`). Только чтение.
 * Производный крит-модификатор считается через `@gob/rules` (§ золотое правило 2), масштабирование
 * оружия берётся как override поверх шаблона (как имя/тир в `getActorInventory`).
 */
export async function getActorRollContext(actor: Actor): Promise<RollContext | null> {
  const character = await prisma.character.findFirst({
    where: activeCharacterWhere(actor),
    orderBy: { updatedAt: "desc" },
    include: {
      attributes: true,
      runtimeState: true,
      equipmentSlots: {
        where: { location: { in: ["equipped_weapon_left", "equipped_weapon_right"] } },
        include: { template: true },
      },
    },
  });
  if (!character) return null;

  const attributes = statBlockOf(character.attributes);
  const ruleConfig = await loadRuleConfig();
  const critBonus = computeDerived(attributes, {}, ruleConfig).critBonus;

  const weapons: WeaponScaling[] = character.equipmentSlots.map((slot) => {
    const hand: "left" | "right" = slot.location === "equipped_weapon_left" ? "left" : "right";
    const name = overrideString(slot.overrides, "name") ?? slot.template?.name ?? "Без названия";
    const attribute =
      attrKeyOf(overrideString(slot.overrides, "scalingAttribute")) ??
      attrKeyOf(slot.template?.scalingAttribute);
    const coefficient =
      overrideNumber(slot.overrides, "scalingCoefficient") ??
      (slot.template?.scalingCoefficient != null ? Number(slot.template.scalingCoefficient) : null);
    const statValue = attribute ? attributes[attribute] : null;
    const bonus =
      attribute && coefficient != null && statValue != null
        ? scalingDamageBonus(statValue, coefficient)
        : null;
    return { name, hand, attribute, coefficient, statValue, bonus };
  });

  return {
    characterId: character.id,
    characterName: character.name,
    attributes,
    critBonus,
    bubbleActive: character.runtimeState?.bubbleActive ?? false,
    bubbleCharges: character.runtimeState?.bubbleCharges ?? 0,
    weapons,
  };
}

/** Исход броска Бабла (`/roll BBL`) с уже применённой записью в БД. */
export interface BubbleRollOutcome {
  rolled: number;
  /** Порог сохранения `min(100, charges × bubbleChargePercent)`. */
  threshold: number;
  fell: boolean;
  previousCharges: number;
  /** Заряды после броска (записаны в БД). */
  charges: number;
  /** Дух персонажа — для индикатора «дух ≥ 6 → не остаётся на 0 насовсем». */
  spirit: number;
}

/**
 * Применить бросок Бабла к активному листу актора и записать состояние (§3.7, мутация).
 * d100 генерирует вызывающий (бот) — RNG в одном месте, математика чистая (`resolveBubbleRoll`).
 * При падении: `bubbleActive=false`, заряды → 0. При сохранении: `bubbleActive=true`, заряды − 1
 * (мин 1). `bubblePersistChanceCurrent` синхронизируем с новыми зарядами для листа на вебе.
 */
export async function applyActorBubbleRoll(
  actor: Actor,
  d100: number,
): Promise<BubbleRollOutcome | { error: string }> {
  const character = await prisma.character.findFirst({
    where: activeCharacterWhere(actor),
    orderBy: { updatedAt: "desc" },
    include: { attributes: true, runtimeState: true },
  });
  if (!character) return { error: "У тебя пока нет персонажа на сайте." };
  if (!canEditCharacter(actor, character)) return { error: "Нет прав на этот лист." };
  if (!character.runtimeState) return { error: "У персонажа нет рантайм-состояния." };

  const previousCharges = character.runtimeState.bubbleCharges;
  if (previousCharges <= 0) return { error: "У тебя 0 зарядов Бабла — нечего бросать." };

  const ruleConfig = await loadRuleConfig();
  const result = resolveBubbleRoll(previousCharges, d100, ruleConfig);

  await prisma.runtimeState.update({
    where: { characterId: character.id },
    data: {
      bubbleActive: !result.fell,
      bubbleCharges: result.nextCharges,
      bubblePersistChanceCurrent: bubblePersistChance(result.nextCharges, ruleConfig),
    },
  });

  return {
    rolled: d100,
    threshold: result.threshold,
    fell: result.fell,
    previousCharges,
    charges: result.nextCharges,
    spirit: statBlockOf(character.attributes).spi,
  };
}
