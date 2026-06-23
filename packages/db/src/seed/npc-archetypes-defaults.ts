import type { PrismaClient } from "@prisma/client";

type WeaponEntry = {
  name: string;
  twoHanded?: boolean;
  count?: number;
  damage?: string;
  special?: string;
};

type ArchetypeRow = {
  race: string;
  typaj: "tank" | "attacker" | "mage" | "healer";
  hitChance: number;
  baseHp: string;
  dodge: number;
  armor: number;
  bubbleSlots: number;
  weapons: WeaponEntry[];
};

// baseHp: число или формула кубика (например "1D6" для насекомых)
// dodge/armor/bubbleSlots: базовые значения до умножения на тир и группировку
const ARCHETYPES: ArchetypeRow[] = [
  // Люди
  { race: "Люди", typaj: "tank",     hitChance: 33, baseHp: "12",  dodge: 0, armor: 0, bubbleSlots: 0, weapons: [{ name: "силовой одноруч" }] },
  { race: "Люди", typaj: "attacker", hitChance: 50, baseHp: "8",   dodge: 1, armor: 0, bubbleSlots: 0, weapons: [{ name: "ловкачный одноруч" }] },
  { race: "Люди", typaj: "mage",     hitChance: 40, baseHp: "4",   dodge: 0, armor: 0, bubbleSlots: 1, weapons: [{ name: "атака", damage: "1D4" }] },
  { race: "Люди", typaj: "healer",   hitChance: 50, baseHp: "1",   dodge: 0, armor: 0, bubbleSlots: 2, weapons: [{ name: "атака", damage: "1D4" }] },

  // Орки
  { race: "Орки", typaj: "tank",     hitChance: 33, baseHp: "16",  dodge: 0, armor: 0, bubbleSlots: 0, weapons: [{ name: "силовой двуруч", twoHanded: true }] },
  { race: "Орки", typaj: "attacker", hitChance: 50, baseHp: "12",  dodge: 1, armor: 0, bubbleSlots: 0, weapons: [{ name: "ловкачный двуруч", twoHanded: true }] },

  // Эльфы
  { race: "Эльфы", typaj: "tank",     hitChance: 33, baseHp: "8",  dodge: 1, armor: 0, bubbleSlots: 0, weapons: [{ name: "ловкачный одноруч", count: 2 }] },
  { race: "Эльфы", typaj: "attacker", hitChance: 50, baseHp: "4",  dodge: 2, armor: 0, bubbleSlots: 0, weapons: [{ name: "лук", twoHanded: true }] },
  { race: "Эльфы", typaj: "mage",     hitChance: 40, baseHp: "4",  dodge: 0, armor: 0, bubbleSlots: 2, weapons: [{ name: "атака", damage: "1D8" }, { name: "путы", special: "путы" }] },
  { race: "Эльфы", typaj: "healer",   hitChance: 50, baseHp: "1",  dodge: 0, armor: 0, bubbleSlots: 3, weapons: [{ name: "атака", damage: "1D8" }] },

  // Звери (атакуют частями тела, baseHp и урон фиксированы)
  { race: "Звери", typaj: "tank",     hitChance: 33, baseHp: "6",  dodge: 0, armor: 0, bubbleSlots: 0, weapons: [{ name: "тело", count: 2 }] },
  { race: "Звери", typaj: "attacker", hitChance: 50, baseHp: "4",  dodge: 0, armor: 0, bubbleSlots: 0, weapons: [{ name: "тело", count: 2, damage: "1" }] },
  { race: "Звери", typaj: "healer",   hitChance: 50, baseHp: "1",  dodge: 0, armor: 0, bubbleSlots: 4, weapons: [{ name: "призыв", special: "призыв 3D4 зверей Тир 1" }] },

  // Наги
  { race: "Наги", typaj: "tank",     hitChance: 33, baseHp: "12", dodge: 0, armor: 2, bubbleSlots: 0, weapons: [{ name: "силовой двуруч", twoHanded: true }] },
  { race: "Наги", typaj: "attacker", hitChance: 50, baseHp: "8",  dodge: 0, armor: 2, bubbleSlots: 0, weapons: [{ name: "силовой одноруч", count: 2 }] },
  { race: "Наги", typaj: "mage",     hitChance: 40, baseHp: "4",  dodge: 0, armor: 2, bubbleSlots: 1, weapons: [{ name: "атака", damage: "2D4" }] },
  { race: "Наги", typaj: "healer",   hitChance: 50, baseHp: "1",  dodge: 0, armor: 2, bubbleSlots: 2, weapons: [{ name: "атака", damage: "1D4", special: "вампиризм" }] },

  // Гномы
  { race: "Гномы", typaj: "tank",     hitChance: 33, baseHp: "12", dodge: 0, armor: 3, bubbleSlots: 0, weapons: [{ name: "силовой двуруч", twoHanded: true }] },
  { race: "Гномы", typaj: "attacker", hitChance: 50, baseHp: "12", dodge: 0, armor: 3, bubbleSlots: 0, weapons: [{ name: "арбалет", twoHanded: true }] },

  // Насекомые (baseHp — формула кубика, бросается 1 раз)
  { race: "Насекомые", typaj: "tank",     hitChance: 33, baseHp: "1D6", dodge: 0, armor: 0, bubbleSlots: 0, weapons: [{ name: "тело", special: "DMG = текущие HP" }] },
  { race: "Насекомые", typaj: "attacker", hitChance: 50, baseHp: "1D4", dodge: 0, armor: 0, bubbleSlots: 0, weapons: [{ name: "тело", special: "DMG = текущие HP, +1 крит" }] },

  // Дриады
  { race: "Дриады", typaj: "attacker", hitChance: 50, baseHp: "4",  dodge: 0, armor: 0, bubbleSlots: 2, weapons: [{ name: "лук", twoHanded: true }] },
  { race: "Дриады", typaj: "mage",     hitChance: 40, baseHp: "4",  dodge: 0, armor: 0, bubbleSlots: 4, weapons: [{ name: "атака", damage: "1D4", special: "чары" }] },
  { race: "Дриады", typaj: "healer",   hitChance: 50, baseHp: "1",  dodge: 0, armor: 0, bubbleSlots: 6, weapons: [{ name: "атака", damage: "1D12", special: "барьер" }] },

  // Демоны
  { race: "Демоны", typaj: "tank",     hitChance: 33, baseHp: "20", dodge: 0, armor: 0, bubbleSlots: 2, weapons: [{ name: "силовой двуруч", twoHanded: true, count: 2 }] },
  { race: "Демоны", typaj: "attacker", hitChance: 50, baseHp: "12", dodge: 1, armor: 0, bubbleSlots: 2, weapons: [{ name: "лук", twoHanded: true }] },
  { race: "Демоны", typaj: "mage",     hitChance: 40, baseHp: "8",  dodge: 0, armor: 0, bubbleSlots: 3, weapons: [{ name: "атака", damage: "1D8" }, { name: "жар", damage: "1D4" }] },
];

export async function seedNpcArchetypes(prisma: PrismaClient) {
  let count = 0;
  for (const row of ARCHETYPES) {
    const race = await prisma.race.findUnique({ where: { name: row.race } });
    if (!race) {
      console.warn(`[seed] NpcArchetype: race "${row.race}" not found — skipping`);
      continue;
    }
    await prisma.npcArchetype.upsert({
      where: { raceId_typaj: { raceId: race.id, typaj: row.typaj } },
      create: {
        raceId: race.id,
        typaj: row.typaj,
        hitChance: row.hitChance,
        baseHp: row.baseHp,
        dodge: row.dodge,
        armor: row.armor,
        bubbleSlots: row.bubbleSlots,
        weapons: row.weapons,
      },
      update: {
        hitChance: row.hitChance,
        baseHp: row.baseHp,
        dodge: row.dodge,
        armor: row.armor,
        bubbleSlots: row.bubbleSlots,
        weapons: row.weapons,
      },
    });
    count++;
  }
  console.log(`[seed] NpcArchetypes: ${count} upserted`);
}
