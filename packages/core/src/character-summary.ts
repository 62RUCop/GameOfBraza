import { prisma } from "@gob/db";
import { computeDerived } from "@gob/rules";
import type { Actor } from "./actor";
import { loadRuleConfig } from "./rule-config";
import { activeCharacterWhere, resourceMax, statBlockOf } from "./character-internal";
import type { StatBlock } from "./character-internal";

export type { StatBlock };

/** Текущее значение ресурса + его эффективный максимум (override либо расчёт). */
export interface ResourcePair {
  current: number;
  max: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  raceName: string | null;
  hp: ResourcePair;
  mana: ResourcePair;
  ap: ResourcePair;
  satiety: number;
  attributes: StatBlock;
}

/**
 * Сводка листа для бота (`/me`). Берём самый свежий не-NPC-персонаж владельца.
 * Производные максимумы считаются на лету через `@gob/rules` (§ золотое правило 2),
 * текущие значения — как есть из `RuntimeState` (никакого clamp, § золотое правило 1).
 */
export async function getActorCharacterSummary(actor: Actor): Promise<CharacterSummary | null> {
  const character = await prisma.character.findFirst({
    where: activeCharacterWhere(actor),
    orderBy: { updatedAt: "desc" },
    include: { attributes: true, runtimeState: true, race: true },
  });
  if (!character) return null;

  const stats = statBlockOf(character.attributes);
  const ruleConfig = await loadRuleConfig();
  const derived = computeDerived(stats, {}, ruleConfig);
  const rt = character.runtimeState;

  return {
    id: character.id,
    name: character.name,
    raceName: character.raceName ?? character.race?.name ?? null,
    hp: { current: rt?.currentHp ?? 0, max: resourceMax("hp", rt, derived) },
    mana: { current: rt?.currentMana ?? 0, max: resourceMax("mana", rt, derived) },
    ap: { current: rt?.currentAp ?? 0, max: resourceMax("ap", rt, derived) },
    satiety: rt?.satietyCurrent ?? 0,
    attributes: stats,
  };
}
