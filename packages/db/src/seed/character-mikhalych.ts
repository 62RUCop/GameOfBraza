/**
 * One-shot seed: creates the character "Михалыч" under alexmgood@gmail.com.
 * Run with: pnpm --filter @gob/db exec tsx src/seed/character-mikhalych.ts
 *
 * Idempotent: skips if a non-deleted character named "Михалыч" already exists
 * for that owner.
 *
 * Значения характеристик взяты из листа игрока (патч от 2026-06). Производные
 * (HP/мана/ОД/бабл/крит) пересчитаны через packages/rules, НЕ хардкодом:
 *   HP_max  = STR 8 × 4  = 32   (в прошлом патче считалось от END — это был баг)
 *   Mana    = SPI 12 × 10 = 120
 *   AP_max  = END 9 × 10  = 90
 *   slots   = INT 8
 *   crit    = floor(LUC 9 / 2) = 4
 *   bubble  = 3 заряда (SPI 12 пересекает пороги {6,9,12})
 */

import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import { computeDerived, DEFAULT_RULE_CONFIG } from "@gob/rules";

const OWNER_EMAIL = "alexmgood@gmail.com";

// ─── Base stats (лист игрока) ─────────────────────────────────────────────────
const STATS = {
  strength: 8,
  endurance: 9,
  spirit: 12,
  intelligence: 8,
  dexterity: 8,
  luck: 9,
};

// ─── Skills to create ─────────────────────────────────────────────────────────
const SKILLS_TO_CREATE = [
  {
    name: "Разговор с орками",
    description: "Умение понимать орков и вести с ними переговоры",
    skillType: "acquired" as const,
    tier: 1,
    occupiesSlot: true,
  },
  {
    name: "Перекачка духа в силу",
    description: "Конвертировать очки Духа в Силу на время боя",
    skillType: "acquired" as const,
    tier: 2,
    occupiesSlot: true,
  },
  {
    name: "Броня в щитки союзникам",
    description: "Передать часть своей брони союзникам в виде временных щитков",
    skillType: "acquired" as const,
    tier: 2,
    occupiesSlot: true,
  },
];

// ─── Active effects (buffs & debuffs) → в заметки runtimeState.activeEffects ───
const ACTIVE_EFFECTS = [
  // Дебафы
  { name: "Бомж",                    type: "debuff", description: "Социальный статус" },
  { name: "Фобия минетов",           type: "debuff", description: "Иррациональный страх" },
  { name: "Член 1,755 см",           type: "debuff", description: "Физическая особенность" },
  { name: "Каждый 3 антикрит в меня",type: "debuff", description: "Каждый третий антикрит автоматически достаётся Михалычу" },
  { name: "Ломкие зубки",            type: "debuff", description: "Зубы ломаются при ударе" },
  { name: "Человек-пугало",          type: "debuff", description: "100х2х3/1000" },
  // Бафы
  { name: "Защитник деревни",        type: "buff",   description: "Репутационный бонус от сельских жителей" },
  { name: "Прилежный ученик",        type: "buff",   description: "Опыт за обучение ×1.1" },
  { name: "Марксист",                type: "buff",   description: "Идеологическая убеждённость" },
  { name: "Бухое измерение",         type: "buff",   description: "Доступ к алкогольному измерению" },
  { name: "Наркоманское измерение",  type: "buff",   description: "Доступ к наркоманскому измерению" },
  { name: "50% шанс превратить дебаф в баф", type: "buff", description: "При получении дебафа — шанс 50% инвертировать его" },
  { name: "Хорош в постели с мужчинами",     type: "buff", description: "Социальный бонус" },
  { name: "Стальная борода",         type: "buff",   description: "+1 к защите от ударов по лицу" },
];

// ─── Reputation (патч от 2026-06: только 9 базовых фракций) ───────────────────
const REPUTATION: Array<{ race: string; value: number }> = [
  { race: "Люди",      value:  1 },
  { race: "Гномы",     value: -1 },
  { race: "Насекомые", value: -1 },
  { race: "Орки",      value: -1 },
  { race: "Демоны",    value: -1 },
  { race: "Наги",      value: -1 },
  { race: "Эльфы",     value:  1 },
  { race: "Звери",     value:  1 },
  { race: "Дриады",    value: -1 },
];

export async function seedMikhalych(prisma: PrismaClient) {
  // ── Owner ──────────────────────────────────────────────────────────────────
  const owner = await prisma.account.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) throw new Error(`User ${OWNER_EMAIL} not found — run pnpm db:seed first`);

  // ── Idempotency guard ──────────────────────────────────────────────────────
  const existing = await prisma.character.findFirst({
    where: { name: "Михалыч", ownerId: owner.id, deletedAt: null },
  });
  if (existing) {
    console.log(`[mikhalych] Character already exists (id=${existing.id}), skipping.`);
    return;
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  const skillIds: Record<string, string> = {};
  for (const s of SKILLS_TO_CREATE) {
    let skill = await prisma.skill.findFirst({ where: { name: s.name, deletedAt: null } });
    if (!skill) {
      skill = await prisma.skill.create({ data: s });
      console.log(`[mikhalych] Created skill "${s.name}"`);
    }
    skillIds[s.name] = skill.id;
  }

  // ── Races for reputation ───────────────────────────────────────────────────
  const raceMap: Record<string, string> = {};
  for (const { race } of REPUTATION) {
    const r = await prisma.race.findUnique({ where: { name: race } });
    if (r) raceMap[race] = r.id;
    else console.warn(`[mikhalych] Race "${race}" not found — skipping reputation entry`);
  }
  const humanRace = await prisma.race.findUnique({ where: { name: "Люди" } });

  // ── Derived (через packages/rules) ─────────────────────────────────────────
  const derived = computeDerived(
    { str: STATS.strength, dex: STATS.dexterity, int: STATS.intelligence, spi: STATS.spirit, end: STATS.endurance, luc: STATS.luck },
    {},
    DEFAULT_RULE_CONFIG,
  );

  // ── Create character ───────────────────────────────────────────────────────
  const character = await prisma.character.create({
    data: {
      name: "Михалыч",
      ownerId: owner.id,
      raceId: humanRace?.id ?? null,
      quenta: "Бронзовый в говне. Классический городской бомж с большим сердцем и стальной бородой.",
      playerNotes: [
        "Котич отрабатывает жепой у Брумгидьды",
        "Паладин бухла",
        "Жена Мегера",
      ].join("\n"),
      mainQuest: [
        "1. Свести барыгу страны с Вуду",
        "2. Принести капельку травнику",
      ].join("\n"),

      attributes: { create: STATS },

      runtimeState: {
        create: {
          currentHp:       derived.hpMax,
          hpMaxComputed:   derived.hpMax,
          currentMana:     derived.manaMax,
          manaMaxComputed: derived.manaMax,
          currentAp:       derived.apMax,
          apMaxComputed:   derived.apMax,
          bubbleActive:    false,
          bubbleCharges:   3,
          activeEffects:   ACTIVE_EFFECTS as never,
        },
      },

      currency: { create: { balanceBronze: 20 } },

      // ── Врождёнка «Бомж», прокачана до 3-го ранга ──────────────────────────
      innateAbility: {
        create: {
          name: "Бомж",
          description: [
            "1 ур.: Хавать с мусорки",
            "2 ур.: Бронзовый в говне",
            "3 ур.: Просить милостыню",
          ].join("\n"),
          currentRank: 3,
        },
      },

      pet: {
        create: {
          name: "Котик",
          species: "Кот",
          level: 1,
          foodProgress: 0,
          statBonuses: { luck: 2 } as never,
        },
      },

      characterSkills: {
        create: SKILLS_TO_CREATE.map((s) => ({ skillId: skillIds[s.name]! })),
      },

      reputations: {
        create: REPUTATION.filter((r) => raceMap[r.race]).map((r) => ({
          raceId: raceMap[r.race]!,
          value: r.value,
        })),
      },

      backpackSlots: {
        create: [
          { slotIndex: 0, itemName: "Клининг набор",  itemType: "misc"   as const, quantity: 1 },
          { slotIndex: 1, itemName: "Зелье силы (+1)", itemType: "potion" as const, quantity: 1, description: "+1 к Силе на один бой" },
          { slotIndex: 2, itemName: "Ахуенная дубина", itemType: "misc"   as const, quantity: 1, description: "Т1, самодельная" },
          { slotIndex: 3, itemName: "Ремнабор",        itemType: "misc"   as const, quantity: 1 },
        ],
      },
    },
  });

  console.log(`[mikhalych] Character created (id=${character.id})`);

  // ── Equipment (ItemInstance) ───────────────────────────────────────────────
  await prisma.itemInstance.create({
    data: {
      characterId: character.id,
      location: "equipped_body",
      overrides: { name: "Грудак автопочинки", tier: 3, description: "Автоматически чинится. Эффект: 100×4." },
    },
  });
  await prisma.itemInstance.create({
    data: {
      characterId: character.id,
      location: "equipped_weapon_left",
      overrides: { name: "Бабл щит", tier: 4, description: "Щит, генерирующий бабл-барьер. Т4." },
    },
  });
  console.log("[mikhalych] Equipment created");

  // ── Initial currency transaction ───────────────────────────────────────────
  await prisma.currencyTransaction.create({
    data: {
      characterId: character.id,
      amountBronze: 20,
      moneyTarget: "Начальная бронза (нашёл в мусорке)",
      createdBy: owner.id,
    },
  });

  console.log("[mikhalych] Done!");
}

// ── CLI: запуск напрямую (pnpm --filter @gob/db exec tsx src/seed/character-mikhalych.ts) ──
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prisma = new PrismaClient();
  seedMikhalych(prisma)
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
