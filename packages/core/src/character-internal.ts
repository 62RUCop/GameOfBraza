import type { Prisma, RuntimeState } from "@gob/db";
import type { computeDerived } from "@gob/rules";
import type { Actor } from "./actor";

type DerivedStats = ReturnType<typeof computeDerived>;

/**
 * Where-фильтр «активного листа» актора: самый свежий не-NPC-персонаж владельца.
 * Единый источник для всех ботовых команд (`/me`, `/hp`, `/money`, `/bag`…), чтобы они
 * смотрели на один и тот же лист и не разъезжались. Сортировку (`updatedAt desc`) задаёт
 * вызывающий — она у `findFirst` идёт рядом с `where`.
 */
export function activeCharacterWhere(actor: Actor): Prisma.CharacterWhereInput {
  return { ownerId: actor.id, deletedAt: null, isNpc: false };
}

/** Базовые характеристики (значения d-граней). */
export interface StatBlock {
  str: number;
  dex: number;
  int: number;
  spi: number;
  end: number;
  luc: number;
}

/** Живой ресурс, который игрок крутит прямо в бою. */
export type RuntimeResource = "hp" | "mana" | "ap";

/** Поле текущего значения ресурса в `RuntimeState`. */
export const RESOURCE_CURRENT_FIELD: Record<RuntimeResource, "currentHp" | "currentMana" | "currentAp"> = {
  hp: "currentHp",
  mana: "currentMana",
  ap: "currentAp",
};

/** Атрибуты из БД → `StatBlock` с дефолтом 3 (если строки нет). */
export function statBlockOf(
  a:
    | { strength: number; dexterity: number; intelligence: number; spirit: number; endurance: number; luck: number }
    | null
    | undefined,
): StatBlock {
  return {
    str: a?.strength ?? 3,
    dex: a?.dexterity ?? 3,
    int: a?.intelligence ?? 3,
    spi: a?.spirit ?? 3,
    end: a?.endurance ?? 3,
    luc: a?.luck ?? 3,
  };
}

/**
 * Эффективный максимум: зафиксированный override (если включён ручной режим), иначе расчёт
 * (§ золотое правило 3). То же правило, что в листе персонажа на вебе.
 */
export function effectiveMax(manualOverride: boolean, override: number | null, computed: number): number {
  return manualOverride && override != null ? override : computed;
}

/** Эффективный максимум конкретного ресурса по парам `RuntimeState` + свежему расчёту. */
export function resourceMax(resource: RuntimeResource, rt: RuntimeState | null, derived: DerivedStats): number {
  const pairs = {
    hp: { manual: rt?.hpMaxManualOverride, override: rt?.hpMaxOverride, computed: derived.hpMax },
    mana: { manual: rt?.manaMaxManualOverride, override: rt?.manaMaxOverride, computed: derived.manaMax },
    ap: { manual: rt?.apMaxManualOverride, override: rt?.apMaxOverride, computed: derived.apMax },
  };
  const p = pairs[resource];
  return effectiveMax(p.manual ?? false, p.override ?? null, p.computed);
}
