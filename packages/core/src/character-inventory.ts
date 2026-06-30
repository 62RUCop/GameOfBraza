import { prisma, type ItemLocation } from "@gob/db";
import type { Actor } from "./actor";
import { activeCharacterWhere } from "./character-internal";

/** Один надетый предмет (имя/тир после применения overrides поверх шаблона). */
export interface EquippedItem {
  location: ItemLocation;
  name: string;
  tier: number | null;
}

/** Строка рюкзака: free-text-слот либо экземпляр предмета в рюкзаке. */
export interface BackpackEntry {
  name: string;
  quantity: number;
}

/** Инвентарь активного листа для бота (`/bag`). */
export interface InventorySummary {
  characterId: string;
  characterName: string;
  equipped: EquippedItem[];
  backpack: BackpackEntry[];
}

/** Эффективное имя предмета: override.name поверх имени шаблона. */
function resolveItemName(overrides: unknown, templateName: string | null | undefined): string {
  const o = (overrides ?? {}) as Record<string, unknown>;
  if (typeof o.name === "string" && o.name.trim() !== "") return o.name;
  return templateName ?? "Без названия";
}

/** Эффективный тир: override.tier (число или строка, как пишет веб) поверх тира шаблона. */
function resolveItemTier(overrides: unknown, templateTier: number | null | undefined): number | null {
  const o = (overrides ?? {}) as Record<string, unknown>;
  if (typeof o.tier === "number") return o.tier;
  if (typeof o.tier === "string" && o.tier.trim() !== "" && !Number.isNaN(Number(o.tier))) {
    return Number(o.tier);
  }
  return templateTier ?? null;
}

/**
 * Инвентарь активного персонажа актора (тот же лист, что показывает `/me`): надетое снаряжение
 * (экземпляры `ItemInstance` с `location = equipped_*`) и рюкзак (free-text `BackpackSlot` +
 * экземпляры с `location = backpack`). Только чтение, без правил — имя/тир получаются как
 * override поверх шаблона (та же логика, что в листе на вебе).
 */
export async function getActorInventory(actor: Actor): Promise<InventorySummary | null> {
  const character = await prisma.character.findFirst({
    where: activeCharacterWhere(actor),
    orderBy: { updatedAt: "desc" },
    include: {
      equipmentSlots: { include: { template: true } },
      backpackSlots: { orderBy: { slotIndex: "asc" } },
    },
  });
  if (!character) return null;

  const instances = character.equipmentSlots;

  const equipped: EquippedItem[] = instances
    .filter((i) => i.location !== "backpack")
    .map((i) => ({
      location: i.location,
      name: resolveItemName(i.overrides, i.template?.name),
      tier: resolveItemTier(i.overrides, i.template?.tier),
    }));

  // Рюкзак: сначала текстовые слоты (по slotIndex), затем экземпляры предметов в рюкзаке.
  const backpack: BackpackEntry[] = [
    ...character.backpackSlots.map((s) => ({ name: s.itemName, quantity: s.quantity })),
    ...instances
      .filter((i) => i.location === "backpack")
      .map((i) => ({ name: resolveItemName(i.overrides, i.template?.name), quantity: 1 })),
  ];

  return { characterId: character.id, characterName: character.name, equipped, backpack };
}
