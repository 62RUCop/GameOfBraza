"use server";

import { auth } from "@/lib/auth";
import { prisma, type ItemLocation } from "@gob/db";
import { loadRuleConfig } from "@/lib/rule-config";
import { computeDerived } from "@gob/rules";
import { parseGoBImport } from "@/lib/gob-brothers-compat";

export async function importCharacterFromJSON(
  json: string,
): Promise<{ characterId: string } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  let data: ReturnType<typeof parseGoBImport>;
  try {
    data = parseGoBImport(json);
  } catch {
    return { error: "Не удалось разобрать JSON. Проверьте формат файла." };
  }

  const ruleConfig = await loadRuleConfig();
  const { str, dex, int, spi, end, luc } = data.stats;
  const derived = computeDerived(
    { str, dex, int, spi, end, luc },
    { hp: 0, mana: 0, ap: 0 },
    ruleConfig,
  );

  const hpMaxOverride = data.hpBonus !== 0 ? derived.hpMax + data.hpBonus : null;
  const manaMaxOverride = data.manaBonus !== 0 ? derived.manaMax + data.manaBonus : null;
  const apMaxOverride = data.apBonus !== 0 ? derived.apMax + data.apBonus : null;

  const character = await prisma.$transaction(async (tx) => {
    const char = await tx.character.create({
      data: {
        ownerId: session.user.id,
        name: data.name,
        raceName: data.raceName,
        groupName: data.groupName,
        quenta: data.quenta,
        playerNotes: data.playerNotes,
        unallocatedPoints: 0,
      },
    });

    await tx.characterAttributes.create({
      data: {
        characterId: char.id,
        strength: str,
        dexterity: dex,
        intelligence: int,
        spirit: spi,
        endurance: end,
        luck: luc,
      },
    });

    await tx.runtimeState.create({
      data: {
        characterId: char.id,
        currentHp: data.currentHp,
        currentMana: data.currentMana,
        currentAp: data.currentAp,
        hpMaxComputed: derived.hpMax,
        hpMaxOverride,
        hpMaxManualOverride: hpMaxOverride !== null,
        manaMaxComputed: derived.manaMax,
        manaMaxOverride,
        manaMaxManualOverride: manaMaxOverride !== null,
        apMaxComputed: derived.apMax,
        apMaxOverride,
        apMaxManualOverride: apMaxOverride !== null,
      },
    });

    await tx.currency.create({
      data: { characterId: char.id, balanceBronze: 0 },
    });

    for (const eq of data.equipment) {
      await tx.itemInstance.create({
        data: {
          characterId: char.id,
          location: eq.location as ItemLocation,
          overrides: { customName: eq.name, description: eq.desc },
        },
      });
    }

    for (const bp of data.backpack) {
      await tx.backpackSlot.create({
        data: {
          characterId: char.id,
          slotIndex: bp.slotIndex,
          itemName: bp.name,
          itemType: "misc",
          description: bp.desc || null,
          quantity: 1,
        },
      });
    }

    return char;
  });

  return { characterId: character.id };
}
