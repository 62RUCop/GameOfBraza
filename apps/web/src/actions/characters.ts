"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import type { Prisma } from "@gob/db";
import { prisma } from "@gob/db";
import { computeDerived, DEFAULT_RULE_CONFIG } from "@gob/rules";

export async function createCharacter(input: { name: string; ownerId: string }) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  if (session.user.id !== input.ownerId && session.user.role === "player") {
    return { error: "Нет прав" };
  }

  try {
    const character = await prisma.character.create({
      data: {
        name: input.name,
        ownerId: input.ownerId,
        attributes: {
          create: {
            strength: 3,
            dexterity: 3,
            intelligence: 3,
            spirit: 3,
            endurance: 3,
            luck: 3,
          },
        },
        runtimeState: {
          create: {
            currentHp: 12,
            currentMana: 30,
            currentAp: 30,
            hpMaxComputed: 12,
            manaMaxComputed: 30,
            apMaxComputed: 30,
          },
        },
        currency: { create: { balanceBronze: 0 } },
      },
    });

    return { id: character.id };
  } catch {
    return { error: "Ошибка при создании персонажа" };
  }
}

// ─── Allocate unallocated points ─────────────────────────────────────────────

type StatKey = "strength" | "dexterity" | "intelligence" | "spirit" | "endurance" | "luck";

const STAT_KEYS: StatKey[] = ["strength", "dexterity", "intelligence", "spirit", "endurance", "luck"];

function pointCost(from: number, to: number): number {
  let cost = 0;
  if (from < to) {
    for (let v = from; v < to; v++) {
      cost += v < 4 ? 1 : v - 2;
    }
  } else {
    for (let v = to; v < from; v++) {
      cost -= v < 4 ? 1 : v - 2;
    }
  }
  return cost;
}

export async function allocatePoints(input: {
  characterId: string;
  deltas: Partial<Record<StatKey, number>>;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
    include: { attributes: true },
  });

  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  if (!character.attributes) return { error: "Характеристики не инициализированы" };

  const attrs = character.attributes;

  // Calculate total point cost
  let totalCost = 0;
  for (const [key, delta] of Object.entries(input.deltas) as [StatKey, number][]) {
    const current = attrs[key];
    totalCost += pointCost(current, current + delta);
  }

  if (totalCost > character.unallocatedPoints) {
    return { error: `Недостаточно очков (нужно ${totalCost.toString()}, есть ${character.unallocatedPoints.toString()})` };
  }

  // Apply deltas
  const newValues: Partial<Record<StatKey, number>> = {};
  for (const [key, delta] of Object.entries(input.deltas) as [StatKey, number][]) {
    const newVal = attrs[key] + delta;
    if (newVal < 0 || newVal > 255) return { error: `Значение ${key} вне диапазона 0–255` };
    newValues[key] = newVal;
  }

  const newAttrs = { ...Object.fromEntries(STAT_KEYS.map((k) => [k, attrs[k]])), ...newValues } as Record<StatKey, number>;

  // Recompute derived for non-overridden values
  const rt = await prisma.runtimeState.findUnique({ where: { characterId: input.characterId } });
  const derived = computeDerived(
    { str: newAttrs.strength, dex: newAttrs.dexterity, int: newAttrs.intelligence, spi: newAttrs.spirit, end: newAttrs.endurance, luc: newAttrs.luck },
    { hp: 0 },
    DEFAULT_RULE_CONFIG,
  );

  await prisma.$transaction([
    prisma.characterAttributes.update({
      where: { characterId: input.characterId },
      data: newValues,
    }),
    prisma.character.update({
      where: { id: input.characterId },
      data: { unallocatedPoints: { decrement: totalCost } },
    }),
    prisma.auditLog.create({
      data: {
        characterId: input.characterId,
        actorId: session.user.id,
        action: "allocate_points",
        field: "attributes",
        oldValue: Object.fromEntries(STAT_KEYS.map((k) => [k, attrs[k]])),
        newValue: newValues,
      },
    }),
    // Update computed values (only for non-overridden)
    ...(rt ? [
      prisma.runtimeState.update({
        where: { characterId: input.characterId },
        data: {
          ...(!rt.hpMaxManualOverride ? { hpMaxComputed: derived.hpMax } : {}),
          ...(!rt.manaMaxManualOverride ? { manaMaxComputed: derived.manaMax } : {}),
          ...(!rt.apMaxManualOverride ? { apMaxComputed: derived.apMax } : {}),
        },
      }),
    ] : []),
  ]);

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── Update current runtime values (HP / mana / AP) ─────────────────────────

export async function updateRuntimeValues(input: {
  characterId: string;
  currentHp?: number;
  currentMana?: number;
  currentAp?: number;
  satietyCurrent?: number;
  bubbleActive?: boolean;
  bubbleCharges?: number;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  const { characterId, ...data } = input;
  await prisma.runtimeState.update({
    where: { characterId },
    data,
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

// ─── Update player notes ──────────────────────────────────────────────────────

export async function updatePlayerNotes(input: {
  characterId: string;
  notes: string;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  await prisma.character.update({
    where: { id: input.characterId },
    data: { playerNotes: input.notes },
  });

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── Backpack slot edit/clear ─────────────────────────────────────────────────

export async function upsertBackpackSlot(input: {
  characterId: string;
  slotIndex: number;
  itemName: string;
  itemType: string;
  quantity: number;
  description?: string;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  await prisma.backpackSlot.upsert({
    where: { characterId_slotIndex: { characterId: input.characterId, slotIndex: input.slotIndex } },
    create: {
      characterId: input.characterId,
      slotIndex: input.slotIndex,
      itemName: input.itemName,
      itemType: input.itemType as never,
      quantity: input.quantity,
      description: input.description ?? null,
    },
    update: {
      itemName: input.itemName,
      itemType: input.itemType as never,
      quantity: input.quantity,
      description: input.description ?? null,
    },
  });

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

export async function clearBackpackSlot(input: {
  characterId: string;
  slotIndex: number;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  await prisma.backpackSlot.deleteMany({
    where: { characterId: input.characterId, slotIndex: input.slotIndex },
  });

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── ItemInstance в слоте снаряжения ──────────────────────────────────────────

async function assertCanEditCharacter(characterId: string) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" as const };

  const character = await prisma.character.findFirst({
    where: { id: characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" as const };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" as const };

  return { character };
}

/** Создать новый ItemInstance из шаблона (или без него) и сразу поместить в слот.
 *  Предыдущий предмет в этом слоте перемещается в backpack. */
export async function createItemInSlot(input: {
  characterId: string;
  slot: string;
  templateId?: string;
  customName?: string;
  overrides?: Record<string, unknown>;
}) {
  const check = await assertCanEditCharacter(input.characterId);
  if ("error" in check) return check;

  await prisma.itemInstance.updateMany({
    where: { characterId: input.characterId, location: input.slot as never },
    data: { location: "backpack" },
  });

  const data: Parameters<typeof prisma.itemInstance.create>[0]["data"] = {
    characterId: input.characterId,
    templateId: input.templateId ?? null,
    location: input.slot as never,
  };
  if (input.overrides && Object.keys(input.overrides).length > 0) {
    data.overrides = input.overrides as Prisma.InputJsonValue;
  } else if (input.customName) {
    data.overrides = { name: input.customName };
  }

  await prisma.itemInstance.create({ data });

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

/** Снять предмет из слота в backpack. */
export async function unequipItem(input: {
  characterId: string;
  itemInstanceId: string;
}) {
  const check = await assertCanEditCharacter(input.characterId);
  if ("error" in check) return check;

  await prisma.itemInstance.update({
    where: { id: input.itemInstanceId },
    data: { location: "backpack" },
  });

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── Update basic character info ─────────────────────────────────────────────

export async function updateCharacterInfo(input: {
  characterId: string;
  name?: string;
  raceId?: string | null;
  groupId?: string | null;
  questProgressStage?: number;
  quenta?: string | null;
  mainQuest?: string | null;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  const { characterId, ...data } = input;
  await prisma.character.update({ where: { id: characterId }, data });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

// ─── Update innate ability rank ───────────────────────────────────────────────

export async function updateInnateAbilityRank(input: {
  characterId: string;
  rank: number;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  await prisma.innateAbility.update({
    where: { characterId: input.characterId },
    data: { currentRank: input.rank },
  });

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── Update currency balance ──────────────────────────────────────────────────

export async function updateCurrencyBalance(input: {
  characterId: string;
  newBalanceBronze: number;
  reason: string;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
    include: { currency: true },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  const oldBalance = Number(character.currency?.balanceBronze ?? 0);
  const diff = input.newBalanceBronze - oldBalance;

  await prisma.$transaction([
    prisma.currency.upsert({
      where: { characterId: input.characterId },
      create: { characterId: input.characterId, balanceBronze: input.newBalanceBronze },
      update: { balanceBronze: input.newBalanceBronze },
    }),
    prisma.currencyTransaction.create({
      data: {
        characterId: input.characterId,
        amountBronze: diff,
        moneyTarget: input.reason,
        createdBy: session.user.id,
      },
    }),
  ]);

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── Update reputation value ──────────────────────────────────────────────────

export async function updateReputation(input: {
  characterId: string;
  raceId: string;
  value: number;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  await prisma.$transaction([
    prisma.reputation.upsert({
      where: { characterId_raceId: { characterId: input.characterId, raceId: input.raceId } },
      create: { characterId: input.characterId, raceId: input.raceId, value: input.value },
      update: { value: input.value },
    }),
    prisma.auditLog.create({
      data: {
        characterId: input.characterId,
        actorId: session.user.id,
        action: "update_reputation",
        field: "reputation",
        newValue: { raceId: input.raceId, value: input.value },
      },
    }),
  ]);

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── Update derived value override (allows owner + gm/admin) ─────────────────

export async function updateDerivedOverride(input: {
  characterId: string;
  field: "hpMax" | "manaMax" | "apMax" | "slots" | "critBonus";
  value: number | null;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
  });
  if (!character) return { error: "Персонаж не найден" };

  const isOwner = character.ownerId === session.user.id;
  const isGmOrAdmin = session.user.role === "gm" || session.user.role === "admin";
  if (!isOwner && !isGmOrAdmin) return { error: "Нет прав" };

  const fieldMap = {
    hpMax:    { override: "hpMaxOverride",    manual: "hpMaxManualOverride" },
    manaMax:  { override: "manaMaxOverride",  manual: "manaMaxManualOverride" },
    apMax:    { override: "apMaxOverride",    manual: "apMaxManualOverride" },
    slots:    { override: "slotsOverride",    manual: "slotsManualOverride" },
    critBonus:{ override: "critBonusOverride",manual: "critBonusManualOverride" },
  } as const;

  const fm = fieldMap[input.field];
  const isReset = input.value === null;

  await prisma.$transaction([
    prisma.runtimeState.update({
      where: { characterId: input.characterId },
      data: {
        [fm.override]: isReset ? null : input.value,
        [fm.manual]: !isReset,
      },
    }),
    prisma.auditLog.create({
      data: {
        characterId: input.characterId,
        actorId: session.user.id,
        action: isReset ? "reset_override" : "set_override",
        field: input.field,
        newValue: { value: input.value },
      },
    }),
  ]);

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── GM: override derived value ───────────────────────────────────────────────

type OverridableField = "hpMax" | "manaMax" | "apMax" | "dodge" | "armor";

export async function gmOverrideDerivedValue(input: {
  characterId: string;
  field: OverridableField;
  value: number | null;
}) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };
  if (session.user.role !== "gm" && session.user.role !== "admin") {
    return { error: "Только ГМ или админ может переопределять значения" };
  }

  const fieldMap: Record<OverridableField, { override: string; manual: string; author: string; at: string }> = {
    hpMax:   { override: "hpMaxOverride",   manual: "hpMaxManualOverride",   author: "hpMaxOverrideAuthor",   at: "hpMaxOverrideAt" },
    manaMax: { override: "manaMaxOverride", manual: "manaMaxManualOverride", author: "manaMaxOverrideAuthor", at: "manaMaxOverrideAt" },
    apMax:   { override: "apMaxOverride",   manual: "apMaxManualOverride",   author: "apMaxOverrideAuthor",   at: "apMaxOverrideAt" },
    dodge:   { override: "dodgeOverride",   manual: "dodgeManualOverride",   author: "dodgeOverrideAuthor",   at: "dodgeOverrideAt" },
    armor:   { override: "armorOverride",   manual: "armorManualOverride",   author: "armorOverrideAuthor",   at: "armorOverrideAt" },
  };

  const fm = fieldMap[input.field];
  const isReset = input.value === null;

  await prisma.$transaction([
    prisma.runtimeState.update({
      where: { characterId: input.characterId },
      data: {
        [fm.override]: isReset ? null : input.value,
        [fm.manual]: !isReset,
        [fm.author]: isReset ? null : session.user.id,
        [fm.at]: isReset ? null : new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        characterId: input.characterId,
        actorId: session.user.id,
        action: isReset ? "reset_override" : "set_override",
        field: input.field,
        newValue: { value: input.value },
      },
    }),
  ]);

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── Use a skill (spend mana / AP) ───────────────────────────────────────────

export async function useSkill(input: {
  characterId: string;
  manaCost: number;
  apCost: number;
}) {
  const check = await assertCanEditCharacter(input.characterId);
  if ("error" in check) return check;

  const rt = await prisma.runtimeState.findUnique({ where: { characterId: input.characterId } });
  if (!rt) return { error: "Состояние персонажа не найдено" };

  await prisma.runtimeState.update({
    where: { characterId: input.characterId },
    data: {
      ...(input.manaCost !== 0 ? { currentMana: rt.currentMana - input.manaCost } : {}),
      ...(input.apCost !== 0 ? { currentAp: rt.currentAp - input.apCost } : {}),
    },
  });

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

// ─── Character skills ─────────────────────────────────────────────────────────

export async function addCharacterSkill(input: {
  characterId: string;
  skillId: string;
}) {
  const check = await assertCanEditCharacter(input.characterId);
  if ("error" in check) return check;

  try {
    await prisma.characterSkill.create({
      data: { characterId: input.characterId, skillId: input.skillId },
    });
  } catch {
    return { error: "Скилл уже добавлен" };
  }

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}

export async function removeCharacterSkill(input: {
  characterId: string;
  characterSkillId: string;
}) {
  const check = await assertCanEditCharacter(input.characterId);
  if ("error" in check) return check;

  await prisma.characterSkill.deleteMany({
    where: { id: input.characterSkillId, characterId: input.characterId },
  });

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}
