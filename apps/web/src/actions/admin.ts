"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@gob/db";
import type { Prisma } from "@gob/db";
import type { RuleConfig } from "@gob/rules";
import { loadRuleConfig } from "@/lib/rule-config";

async function requireAdmin() {
  const session = await auth();
  if (!session) return { error: "Не авторизован" as const };
  if (session.user.role !== "admin") return { error: "Только администратор" as const };
  return { session };
}

// ─── RuleConfig ───────────────────────────────────────────────────────────────

// Config keys that affect derived RuntimeState fields
const CONFIG_KEY_TO_DERIVED = {
  hpPerStr: "hpMax",
  manaPerSpi: "manaMax",
  apPerEnd: "apMax",
  lucCritStep: "critBonus",
} as const satisfies Partial<Record<string, "hpMax" | "manaMax" | "apMax" | "critBonus">>;

type AffectedDerived = (typeof CONFIG_KEY_TO_DERIVED)[keyof typeof CONFIG_KEY_TO_DERIVED];

export async function upsertRuleConfig(input: { key: string; value: unknown }) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const affected = CONFIG_KEY_TO_DERIVED[input.key as keyof typeof CONFIG_KEY_TO_DERIVED] as AffectedDerived | undefined;

  // For critBonus, we need the old lucCritStep before overwriting it
  const oldConfig = affected === "critBonus" ? await loadRuleConfig() : null;

  await prisma.ruleConfig.upsert({
    where: { key: input.key },
    create: { key: input.key, value: input.value as Prisma.InputJsonValue, updatedBy: check.session.user.id },
    update: { value: input.value as Prisma.InputJsonValue, updatedBy: check.session.user.id },
  });

  if (affected) {
    const newConfig = await loadRuleConfig();
    await repinDerivedAfterConfigChange(affected, newConfig, oldConfig);
  }

  revalidatePath("/admin/rules");
  revalidatePath("/characters", "layout");
  return { ok: true };
}

type UpdateData = Parameters<typeof prisma.runtimeState.update>[0]["data"];

async function repinDerivedAfterConfigChange(
  field: AffectedDerived,
  newConfig: RuleConfig,
  oldConfig: RuleConfig | null,
) {
  const now = new Date();

  const characters = await prisma.character.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      attributes: { select: { luck: true } },
      runtimeState: {
        select: {
          hpMaxComputed: true, hpMaxManualOverride: true,
          manaMaxComputed: true, manaMaxManualOverride: true,
          apMaxComputed: true, apMaxManualOverride: true,
          critBonusManualOverride: true,
        },
      },
    },
  });

  const updates = characters.flatMap((c) => {
    const rt = c.runtimeState;
    if (!rt) return [];

    const data: UpdateData = {};

    if (field === "hpMax") {
      // Old value already stored in hpMaxComputed — use it to pin
      if (!rt.hpMaxManualOverride) {
        data.hpMaxOverride = rt.hpMaxComputed;
        data.hpMaxManualOverride = true;
        data.hpMaxOverrideAuthor = "__config__";
        data.hpMaxOverrideAt = now;
      }
      // hpMaxComputed stays as-is until next stat change (will be recomputed with new config then)
    } else if (field === "manaMax") {
      if (!rt.manaMaxManualOverride) {
        data.manaMaxOverride = rt.manaMaxComputed;
        data.manaMaxManualOverride = true;
        data.manaMaxOverrideAuthor = "__config__";
        data.manaMaxOverrideAt = now;
      }
    } else if (field === "apMax") {
      if (!rt.apMaxManualOverride) {
        data.apMaxOverride = rt.apMaxComputed;
        data.apMaxManualOverride = true;
        data.apMaxOverrideAuthor = "__config__";
        data.apMaxOverrideAt = now;
      }
    } else {
      // critBonus — no stored computed; derive old value from oldConfig + luc
      if (!rt.critBonusManualOverride && oldConfig && c.attributes) {
        const oldCritBonus = Math.floor(c.attributes.luck / oldConfig.lucCritStep);
        data.critBonusOverride = oldCritBonus;
        data.critBonusManualOverride = true;
        data.critBonusOverrideAuthor = "__config__";
      }
    }

    if (Object.keys(data).length === 0) return [];
    return [prisma.runtimeState.update({ where: { characterId: c.id }, data })];
  });

  await Promise.all(updates);
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
  manaCost?: number;
  apCost?: number;
  authorName?: string;
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
    manaCost: input.manaCost ?? null,
    apCost: input.apCost ?? null,
    authorName: input.authorName ?? null,
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
