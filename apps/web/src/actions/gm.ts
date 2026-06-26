"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@gob/db";
import { computeDerived } from "@gob/rules";
import { loadRuleConfig } from "@/lib/rule-config";

async function requireGm() {
  const session = await auth();
  if (!session) return { error: "Не авторизован" as const };
  if (session.user.role !== "gm" && session.user.role !== "admin") {
    return { error: "Только ГМ или администратор" as const };
  }
  return { session };
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function createCampaign(name: string) {
  const check = await requireGm();
  if ("error" in check) return { error: check.error };

  const campaign = await prisma.campaign.create({
    data: { name, gmId: check.session.user.id },
  });

  revalidatePath("/gm");
  return { id: campaign.id };
}

export async function addCharacterToCampaign(campaignId: string, characterId: string) {
  const check = await requireGm();
  if ("error" in check) return { error: check.error };

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, gmId: check.session.user.id, deletedAt: null },
  });
  if (!campaign) return { error: "Кампания не найдена или нет прав" };

  await prisma.campaignCharacter.upsert({
    where: { campaignId_characterId: { campaignId, characterId } },
    create: { campaignId, characterId },
    update: {},
  });

  revalidatePath(`/gm/${campaignId}`);
  return { ok: true };
}

export async function removeCharacterFromCampaign(campaignId: string, characterId: string) {
  const check = await requireGm();
  if ("error" in check) return { error: check.error };

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, gmId: check.session.user.id, deletedAt: null },
  });
  if (!campaign) return { error: "Кампания не найдена или нет прав" };

  await prisma.campaignCharacter.delete({
    where: { campaignId_characterId: { campaignId, characterId } },
  });

  revalidatePath(`/gm/${campaignId}`);
  return { ok: true };
}

// ─── NPC creation ─────────────────────────────────────────────────────────────

export async function createNpc(input: { name: string; campaignId: string }) {
  const check = await requireGm();
  if ("error" in check) return { error: check.error };

  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaignId, gmId: check.session.user.id, deletedAt: null },
  });
  if (!campaign) return { error: "Кампания не найдена или нет прав" };

  const npc = await prisma.character.create({
    data: {
      name: input.name,
      ownerId: check.session.user.id,
      isNpc: true,
      attributes: { create: { strength: 3, dexterity: 3, intelligence: 3, spirit: 3, endurance: 3, luck: 3 } },
      runtimeState: { create: { currentHp: 12, currentMana: 30, currentAp: 30, hpMaxComputed: 12, manaMaxComputed: 30, apMaxComputed: 30 } },
      currency: { create: { balanceBronze: 0 } },
      campaigns: { create: { campaignId: input.campaignId } },
    },
  });

  revalidatePath(`/gm/${input.campaignId}`);
  return { id: npc.id };
}

// ─── Direct attribute set (bypasses point-buy) ────────────────────────────────

type StatKey = "strength" | "dexterity" | "intelligence" | "spirit" | "endurance" | "luck";

export async function gmSetAttribute(input: {
  characterId: string;
  stat: StatKey;
  value: number;
}) {
  const check = await requireGm();
  if ("error" in check) return { error: check.error };

  if (input.value < 0 || input.value > 255) {
    return { error: "Значение должно быть в диапазоне 0–255" };
  }

  const character = await prisma.character.findFirst({
    where: { id: input.characterId, deletedAt: null },
    include: { attributes: true, runtimeState: true },
  });
  if (!character) return { error: "Персонаж не найден" };

  if (!character.attributes) return { error: "Характеристики не инициализированы" };

  const newAttrs = {
    strength: character.attributes.strength,
    dexterity: character.attributes.dexterity,
    intelligence: character.attributes.intelligence,
    spirit: character.attributes.spirit,
    endurance: character.attributes.endurance,
    luck: character.attributes.luck,
    [input.stat]: input.value,
  };

  const ruleConfig = await loadRuleConfig();
  const derived = computeDerived(
    { str: newAttrs.strength, dex: newAttrs.dexterity, int: newAttrs.intelligence, spi: newAttrs.spirit, end: newAttrs.endurance, luc: newAttrs.luck },
    { hp: 0 },
    ruleConfig,
  );

  const rt = character.runtimeState;

  await prisma.$transaction([
    prisma.characterAttributes.update({
      where: { characterId: input.characterId },
      data: { [input.stat]: input.value },
    }),
    prisma.auditLog.create({
      data: {
        characterId: input.characterId,
        actorId: check.session.user.id,
        action: "gm_set_attribute",
        field: input.stat,
        oldValue: { value: character.attributes[input.stat] },
        newValue: { value: input.value },
      },
    }),
    ...(rt ? [prisma.runtimeState.update({
      where: { characterId: input.characterId },
      data: {
        ...(!rt.hpMaxManualOverride ? { hpMaxComputed: derived.hpMax } : {}),
        ...(!rt.manaMaxManualOverride ? { manaMaxComputed: derived.manaMax } : {}),
        ...(!rt.apMaxManualOverride ? { apMaxComputed: derived.apMax } : {}),
      },
    })] : []),
  ]);

  revalidatePath(`/characters/${input.characterId}`);
  return { ok: true };
}
