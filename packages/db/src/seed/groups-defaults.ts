import type { PrismaClient } from "@prisma/client";

const BASE_GROUPS = [
  {
    name: "Разбойник",
    modifierType: "fixed" as const,
    modifierValue: "0.5",
    specialEffect: null,
  },
  {
    name: "Стражник",
    modifierType: "fixed" as const,
    modifierValue: "1.5",
    specialEffect: null,
  },
  {
    name: "Странник",
    modifierType: "dice" as const,
    modifierValue: null,
    modifierDice: "1D4",
    specialEffect: "Модификатор бросается 1 раз при первом появлении НПС и фиксируется",
  },
  {
    name: "Святой",
    modifierType: "fixed" as const,
    modifierValue: "2.0",
    specialEffect: null,
  },
  {
    name: "Механизм",
    modifierType: "fixed" as const,
    modifierValue: "1.0",
    specialEffect: "+3 к броне (прибавляется после умножения на тир)",
  },
  {
    name: "Нежить",
    modifierType: "fixed" as const,
    modifierValue: "0.25",
    specialEffect: "20% шанс воскреснуть после смерти",
  },
  {
    name: "Вампир",
    modifierType: "fixed" as const,
    modifierValue: "2.0",
    specialEffect: "Хилится на 2×Тир HP после каждого удара",
  },
];

export async function seedGroups(prisma: PrismaClient) {
  for (const g of BASE_GROUPS) {
    const modifierDice = "modifierDice" in g ? (g as { modifierDice?: string }).modifierDice ?? null : null;
    await prisma.group.upsert({
      where: { name: g.name },
      create: {
        name: g.name,
        modifierType: g.modifierType,
        modifierValue: g.modifierValue ?? null,
        modifierDice,
        specialEffect: g.specialEffect,
      },
      update: {
        modifierType: g.modifierType,
        modifierValue: g.modifierValue ?? null,
        modifierDice,
        specialEffect: g.specialEffect,
      },
    });
  }
  console.log(`[seed] Groups: ${BASE_GROUPS.length} upserted`);
}
