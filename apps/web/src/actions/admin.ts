"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, Prisma } from "@gob/db";

async function requireAdmin() {
  const session = await auth();
  if (!session) return { error: "Не авторизован" as const };
  if (session.user.role !== "admin") return { error: "Только администратор" as const };
  return { session };
}

// ─── RuleConfig ───────────────────────────────────────────────────────────────

export async function upsertRuleConfig(input: { key: string; value: unknown }) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  await prisma.ruleConfig.upsert({
    where: { key: input.key },
    create: { key: input.key, value: input.value as Prisma.InputJsonValue, updatedBy: check.session.user.id },
    update: { value: input.value as Prisma.InputJsonValue, updatedBy: check.session.user.id },
  });

  revalidatePath("/admin/rules");
  return { ok: true };
}

export async function deleteRuleConfig(key: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.ruleConfig.delete({ where: { key } });
  revalidatePath("/admin/rules");
  return { ok: true };
}

// ─── Races ────────────────────────────────────────────────────────────────────

export async function upsertRace(input: { id?: string; name: string; description?: string }) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  if (input.id) {
    await prisma.race.update({
      where: { id: input.id },
      data: { name: input.name, description: input.description ?? null },
    });
  } else {
    await prisma.race.create({
      data: { name: input.name, description: input.description ?? null },
    });
  }

  revalidatePath("/admin/races");
  return { ok: true };
}

export async function softDeleteRace(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.race.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/admin/races");
  return { ok: true };
}

export async function restoreRace(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.race.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/admin/races");
  return { ok: true };
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function upsertGroup(input: { id?: string; name: string; description?: string }) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  if (input.id) {
    await prisma.group.update({
      where: { id: input.id },
      data: { name: input.name, description: input.description ?? null },
    });
  } else {
    await prisma.group.create({
      data: { name: input.name, description: input.description ?? null },
    });
  }

  revalidatePath("/admin/groups");
  return { ok: true };
}

export async function softDeleteGroup(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.group.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/admin/groups");
  return { ok: true };
}

export async function restoreGroup(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.group.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/admin/groups");
  return { ok: true };
}

// ─── Skill Categories ─────────────────────────────────────────────────────────

export async function upsertSkillCategory(input: { id?: string; name: string }) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  if (input.id) {
    await prisma.skillCategory.update({ where: { id: input.id }, data: { name: input.name } });
  } else {
    await prisma.skillCategory.create({ data: { name: input.name } });
  }

  revalidatePath("/admin/skills");
  return { ok: true };
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export async function upsertSkill(input: {
  id?: string;
  name: string;
  description?: string;
  skillType: string;
  occupiesSlot: boolean;
  tier: number;
  guildId?: string;
  tiedAttribute?: string;
  manaCost?: number;
  apCost?: number;
}) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const data = {
    name: input.name,
    description: input.description ?? null,
    skillType: input.skillType as never,
    occupiesSlot: input.occupiesSlot,
    tier: input.tier,
    guildId: input.guildId ?? null,
    tiedAttribute: (input.tiedAttribute ?? null) as never,
    manaCost: input.manaCost ?? null,
    apCost: input.apCost ?? null,
  };

  if (input.id) {
    await prisma.skill.update({ where: { id: input.id }, data });
  } else {
    await prisma.skill.create({ data });
  }

  revalidatePath("/admin/skills");
  return { ok: true };
}

export async function softDeleteSkill(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.skill.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/admin/skills");
  return { ok: true };
}

export async function restoreSkill(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.skill.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/admin/skills");
  return { ok: true };
}

// ─── Item Templates ───────────────────────────────────────────────────────────

export async function upsertItemTemplate(input: {
  id?: string;
  name: string;
  slotType: string;
  tier: number;
  weaponFamily?: string;
  isTwoHanded: boolean;
  requiredAttribute?: string;
  damageDice?: string;
  bonusCritDice?: string;
  scalingAttribute?: string;
  scalingCoefficient?: number;
  statBonuses?: unknown;
  hungerRestored?: number;
  referencePrice: number;
  description?: string;
}) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const data = {
    name: input.name,
    slotType: input.slotType as never,
    tier: input.tier,
    weaponFamily: input.weaponFamily ?? null,
    isTwoHanded: input.isTwoHanded,
    requiredAttribute: (input.requiredAttribute ?? null) as never,
    damageDice: input.damageDice ?? null,
    bonusCritDice: input.bonusCritDice ?? null,
    scalingAttribute: (input.scalingAttribute ?? null) as never,
    scalingCoefficient: input.scalingCoefficient ?? null,
    statBonuses: input.statBonuses != null
      ? (input.statBonuses as Prisma.InputJsonValue)
      : Prisma.DbNull,
    hungerRestored: input.hungerRestored ?? null,
    referencePrice: input.referencePrice,
    description: input.description ?? null,
  };

  if (input.id) {
    await prisma.itemTemplate.update({ where: { id: input.id }, data });
  } else {
    await prisma.itemTemplate.create({ data });
  }

  revalidatePath("/admin/items");
  return { ok: true };
}

export async function softDeleteItemTemplate(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.itemTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/admin/items");
  return { ok: true };
}

export async function restoreItemTemplate(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };
  await prisma.itemTemplate.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/admin/items");
  return { ok: true };
}
