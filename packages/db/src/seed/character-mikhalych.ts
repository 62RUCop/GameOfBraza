/**
 * One-shot seed: creates the character "Михалыч" under player@gob.local.
 * Run with: pnpm --filter @gob/db exec tsx src/seed/character-mikhalych.ts
 *
 * Idempotent: skips if a non-deleted character named "Михалыч" already exists
 * for that owner.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OWNER_EMAIL = "player@gob.local";

// ─── Additional races needed for reputation ───────────────────────────────────
const EXTRA_RACES = [
  { name: "Мехи",       description: "Механические существа" },
  { name: "Святые",     description: "Представители светлых сил" },
  { name: "Разбойники", description: "Криминальное подполье" },
  { name: "Охотники",   description: "Охотники на монстров" },
  { name: "Истина",     description: "Хранители истины" },
  { name: "Нежить",     description: "Мертворождённые существа" },
];

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

// ─── Active effects (buffs & debuffs) ────────────────────────────────────────
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

async function main() {
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

  // ── Extra races ────────────────────────────────────────────────────────────
  for (const r of EXTRA_RACES) {
    await prisma.race.upsert({ where: { name: r.name }, create: r, update: { description: r.description } });
  }
  console.log("[mikhalych] Extra races ensured");

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
  const raceNames = [
    "Мехи", "Люди", "Гномы", "Святые", "Насекомые",
    "Орки", "Разбойники", "Демоны", "Наги", "Эльфы",
    "Звери", "Охотники", "Истина", "Дриады", "Нежить",
  ];
  for (const name of raceNames) {
    const race = await prisma.race.findUnique({ where: { name } });
    if (race) raceMap[name] = race.id;
    else console.warn(`[mikhalych] Race "${name}" not found — skipping reputation entry`);
  }

  // ── Reputation values ──────────────────────────────────────────────────────
  const REPUTATION: Array<{ race: string; value: number }> = [
    { race: "Мехи",       value:  0 },
    { race: "Люди",       value:  1 },
    { race: "Гномы",      value: -1 },
    { race: "Святые",     value:  5 },
    { race: "Насекомые",  value: -1 },
    { race: "Орки",       value: -1 },
    { race: "Разбойники", value: -1 },
    { race: "Демоны",     value: -1 },
    { race: "Наги",       value: -1 },
    { race: "Эльфы",      value:  1 },
    { race: "Звери",      value:  1 },
    { race: "Охотники",   value:  2 },
    { race: "Истина",     value: -1 },
    { race: "Дриады",     value: -1 },
    { race: "Нежить",     value: -5 },
  ];

  // ── Create character ───────────────────────────────────────────────────────
  const humanRace = await prisma.race.findUnique({ where: { name: "Люди" } });

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

      // ── Attributes ────────────────────────────────────────────────────────
      attributes: {
        create: {
          strength:     8,
          endurance:    9,
          spirit:       12,
          intelligence: 8,
          dexterity:    8,
          luck:         9,
        },
      },

      // ── Runtime state ──────────────────────────────────────────────────────
      // HP = Выносливость 9, Мана = Дух 12×... will be computed; set reasonable defaults
      runtimeState: {
        create: {
          currentHp:        40,
          hpMaxComputed:    36,  // Выносливость 9 × 4
          currentMana:      36,
          manaMaxComputed:  120, // Дух 12 × 10
          currentAp:        30,
          apMaxComputed:    90,  // Выносливость 9 × 10
          bubbleActive:     false,
          bubbleCharges:    3,   // Дух 12 → 3 бабла
          activeEffects:    ACTIVE_EFFECTS as never,
        },
      },

      // ── Currency ───────────────────────────────────────────────────────────
      currency: { create: { balanceBronze: 20 } }, // немного бронзы

      // ── Innate ability ─────────────────────────────────────────────────────
      innateAbility: {
        create: {
          name: "Бомж",
          description: "Хавать с мусорки. Просить милостыню. Выживать в любых условиях.",
          currentRank: 1,
        },
      },

      // ── Pet ────────────────────────────────────────────────────────────────
      pet: {
        create: {
          name: "Котик",
          species: "Кот",
          level: 1,
          foodProgress: 0,
          statBonuses: { luck: 2, food: ["мясо", "молоко"] } as never,
        },
      },

      // ── Skills ────────────────────────────────────────────────────────────
      characterSkills: {
        create: SKILLS_TO_CREATE.map((s) => ({ skillId: skillIds[s.name]! })),
      },

      // ── Reputation ────────────────────────────────────────────────────────
      reputations: {
        create: REPUTATION
          .filter((r) => raceMap[r.race])
          .map((r) => ({ raceId: raceMap[r.race]!, value: r.value })),
      },

      // ── Backpack ──────────────────────────────────────────────────────────
      backpackSlots: {
        create: [
          { slotIndex: 0, itemName: "Клининг набор",       itemType: "misc"    as const, quantity: 1 },
          { slotIndex: 1, itemName: "Зелье силы (+1)",      itemType: "potion"  as const, quantity: 1, description: "+1 к Силе на один бой" },
          { slotIndex: 2, itemName: "Ахуенная дубина",      itemType: "misc"    as const, quantity: 1, description: "Т1, самодельная" },
          { slotIndex: 3, itemName: "Ремнабор",             itemType: "misc"    as const, quantity: 1 },
        ],
      },
    },
  });

  console.log(`[mikhalych] Character created (id=${character.id})`);

  // ── Equipment (ItemInstance) — created after character ────────────────────
  await prisma.itemInstance.create({
    data: {
      characterId: character.id,
      location: "equipped_body",
      overrides: {
        name: "Грудак автопочинки",
        tier: 3,
        description: "Автоматически чинится. Эффект: 100×4.",
      },
    },
  });

  await prisma.itemInstance.create({
    data: {
      characterId: character.id,
      location: "equipped_weapon_left",
      overrides: {
        name: "Бабл щит",
        tier: 4,
        description: "Щит, генерирующий бабл-барьер. Т4.",
      },
    },
  });

  console.log("[mikhalych] Equipment created");

  // ── Currency transaction (initial) ────────────────────────────────────────
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

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
