/**
 * Демо/тестовый персонаж под флагом `SEED_DEMO=true`.
 * Задача — дать «богатую» анкету для проверки UI: заполнены все вкладки листа,
 * есть ручные оверрайды, надетое снаряжение по шаблонам каталога, рюкзак,
 * скиллы, репутация, валюта с транзакциями, питомец, врождёнка, эффекты.
 *
 * Производные значения (HP/мана/ОД/слоты/крит/бабл) считаются ТОЛЬКО через
 * `@gob/rules`, не хардкодом (золотое правило 2). Хранится то, что «ввёл бы
 * игрок»: текущие значения, *Computed (подсказка формулы) и *Override (пин).
 *
 * Идемпотентность: пропускаем, если у владельца уже есть не удалённый персонаж
 * с этим именем. Скиллы — общий каталог, создаются по имени, если их ещё нет.
 *
 * CLI: pnpm --filter @gob/db exec tsx src/seed/character-demo.ts
 */

import { Prisma, type PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import {
  computeDerived,
  bubblePersistChance,
  classIndex,
  DEFAULT_RULE_CONFIG,
} from "@gob/rules";

const CHARACTER_NAME = "Бранд Серый";
const OWNER_EMAIL = "demo@gob.local";

// ─── Базовые характеристики ──────────────────────────────────────────────────
// Подобраны так, чтобы пересекать пороги классов {6,9,12,20} и тиры:
// STR 12 → класс-индекс 2, SPI 10 → 2 заряда бабла.
const STATS = {
  strength: 12,
  dexterity: 8,
  intelligence: 7,
  spirit: 10,
  endurance: 9,
  luck: 8,
};

// ─── Эффекты (баф/дебаф) → runtimeState.activeEffects (JSON) ──────────────────
const ACTIVE_EFFECTS = [
  { name: "Благословение странника", type: "buff", description: "+1 к броску в дороге до следующего привала." },
  { name: "Лёгкая усталость", type: "debuff", description: "−1 ОД, снимается отдыхом." },
];

// ─── Скиллы (общий каталог, изучённые персонажем) ─────────────────────────────
const ACQUIRED_SKILLS = [
  { name: "Мощный удар", description: "Усиленная атака в ближнем бою.", skillType: "acquired" as const, tier: 1, occupiesSlot: true, tiedAttribute: "strength" as const, apCost: 10 },
  { name: "Боевой клич", description: "Воодушевляет союзников рядом.", skillType: "acquired" as const, tier: 1, occupiesSlot: true, apCost: 15 },
  { name: "Стойкость", description: "Снижает получаемый урон, пока активна.", skillType: "acquired" as const, tier: 2, occupiesSlot: true, tiedAttribute: "endurance" as const },
  { name: "Малое исцеление", description: "Восстанавливает немного HP союзнику.", skillType: "acquired" as const, tier: 1, occupiesSlot: true, tiedAttribute: "spirit" as const, manaCost: 20 },
];

// Способность питомца — отдельный скилл, на слот персонажа не влияет.
const PET_SKILL = {
  name: "Звериный укус",
  description: "Питомец кусает врага, нанося урон по Ловкости.",
  skillType: "innate" as const,
  tier: 1,
  occupiesSlot: false,
  tiedAttribute: "dexterity" as const,
};

// ─── Репутация по фракциям (−10..+10) ─────────────────────────────────────────
const REPUTATION: Array<{ race: string; value: number }> = [
  { race: "Люди", value: 3 },
  { race: "Гномы", value: 2 },
  { race: "Эльфы", value: 1 },
  { race: "Наги", value: 1 },
  { race: "Дриады", value: 1 },
  { race: "Звери", value: 0 },
  { race: "Насекомые", value: -1 },
  { race: "Орки", value: -2 },
  { race: "Демоны", value: -4 },
];

// ─── Надетое снаряжение из каталога (по категории → ItemTemplate) ─────────────
// Натуральное имя шаблона — "Категория Тир N"; берём нужный тир, при отсутствии —
// наименьший доступный, чтобы сид не падал при изменении CSV.
const EQUIPMENT: Array<{ category: string; tier: number; location: string }> = [
  { category: "Сила Одноручный", tier: 1, location: "equipped_weapon_right" },
  { category: "Латы", tier: 2, location: "equipped_body" },
  { category: "Шлем", tier: 2, location: "equipped_head" },
  { category: "Сапоги (латные)", tier: 1, location: "equipped_legs" },
  { category: "Наручи (латные)", tier: 1, location: "equipped_vambraces" },
  { category: "Кольцо", tier: 1, location: "equipped_ring" },
  { category: "Ожерелье", tier: 1, location: "equipped_amulet" },
];

/** Найти шаблон по категории: сперва точный тир, иначе наименьший доступный. */
async function findTemplateByCategory(prisma: PrismaClient, category: string, preferTier: number) {
  const exact = await prisma.itemTemplate.findFirst({
    where: { name: `${category} Тир ${preferTier}`, deletedAt: null },
  });
  if (exact) return exact;
  return prisma.itemTemplate.findFirst({
    where: { name: { startsWith: category }, deletedAt: null },
    orderBy: { tier: "asc" },
  });
}

export async function seedDemoCharacter(prisma: PrismaClient) {
  // ── Владелец ────────────────────────────────────────────────────────────────
  const owner = await prisma.account.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) {
    console.warn(`[demo] Владелец ${OWNER_EMAIL} не найден — пропуск (нужен seedDevUsers).`);
    return;
  }

  // ── Идемпотентность ───────────────────────────────────────────────────────────
  const existing = await prisma.character.findFirst({
    where: { name: CHARACTER_NAME, ownerId: owner.id, deletedAt: null },
  });
  if (existing) {
    console.log(`[demo] Персонаж уже существует (id=${existing.id}), пропуск.`);
    return;
  }

  // ── Скиллы (создаём по имени, если ещё нет) ──────────────────────────────────
  const skillIds: Record<string, string> = {};
  for (const s of [...ACQUIRED_SKILLS, PET_SKILL]) {
    let skill = await prisma.skill.findFirst({ where: { name: s.name, deletedAt: null } });
    if (!skill) {
      skill = await prisma.skill.create({ data: s });
      console.log(`[demo] Создан скилл "${s.name}"`);
    }
    skillIds[s.name] = skill.id;
  }

  // ── Расы (для FK и репутации) ────────────────────────────────────────────────
  const races = await prisma.race.findMany({ select: { id: true, name: true } });
  const raceByName = new Map(races.map((r) => [r.name, r.id]));
  const humanRaceId = raceByName.get("Люди") ?? null;

  // ── Производные значения (через @gob/rules) ──────────────────────────────────
  const derived = computeDerived(
    { str: STATS.strength, dex: STATS.dexterity, int: STATS.intelligence, spi: STATS.spirit, end: STATS.endurance, luc: STATS.luck },
    {},
    DEFAULT_RULE_CONFIG,
  );
  // Заряды бабла = число пройденных порогов класса по Духу (class-index + 1).
  const bubbleCharges = Math.max(0, classIndex(STATS.spirit, DEFAULT_RULE_CONFIG.classThresholds) + 1);
  const bubblePersist = bubblePersistChance(bubbleCharges, DEFAULT_RULE_CONFIG);
  const now = new Date();

  // ── Создание персонажа со вложенными связями ─────────────────────────────────
  const character = await prisma.character.create({
    data: {
      name: CHARACTER_NAME,
      ownerId: owner.id,
      raceId: humanRaceId, // раса выбрана из справочника (FK)
      groupName: "Вольный отряд «Серые плащи»", // группировка — free-text
      groupBonusNotes: "Бонус отряда: +1 к переговорам в человеческих поселениях.",
      quenta: "Странствующий наёмник из вольного отряда «Серые плащи». Немногословен, надёжен в бою, копит на собственную кузницу.",
      mainQuest: ["1. Разведать руины к востоку от тракта.", "2. Вернуть долг гильдии в Серебряной гавани."].join("\n"),
      questProgressStage: 1,
      playerNotes: ["Предпочитает решать вопросы миром, но щит держит наготове.", "Должен трактирщику за ночлег."].join("\n"),
      unallocatedPoints: 2, // чтобы протестировать режим распределения очков

      attributes: { create: STATS },

      runtimeState: {
        create: {
          // Текущие (live) значения — разнообразные, в т.ч. оверхил по HP.
          currentHp: derived.hpMax + 4, // 52 при максимуме 48 → нейтральная подсветка «оверхил»
          currentMana: 80,
          currentAp: 90,
          satietyCurrent: 8, // в пределах [−hpMax, str+end]
          bubbleActive: true,
          bubbleCharges,
          bubblePersistChanceCurrent: bubblePersist,
          activeEffects: ACTIVE_EFFECTS as unknown as Prisma.InputJsonValue,

          // HP/мана — без ручного оверрайда, только подсказка формулы.
          hpMaxComputed: derived.hpMax,
          manaMaxComputed: derived.manaMax,

          // ОД — закреплённый («пин») оверрайд поверх расчёта.
          apMaxComputed: derived.apMax,
          apMaxOverride: 100,
          apMaxManualOverride: true,
          apMaxOverrideAuthor: owner.id,
          apMaxOverrideAt: now,

          dodgeComputed: 0,

          // Броня — формулой не считается (идёт от снаряжения); зафиксирована вручную.
          armorComputed: 0,
          armorOverride: 6,
          armorManualOverride: true,
          armorOverrideAuthor: owner.id,
          armorOverrideAt: now,

          // Слоты способностей — пин поверх INT (7 → 8).
          slotsOverride: 8,
          slotsManualOverride: true,
          // critBonus оставлен расчётным (floor(luc/2)).
        },
      },

      currency: { create: { balanceBronze: 150 } },

      pet: {
        create: {
          name: "Серый",
          species: "Волк",
          level: 2,
          foodProgress: 30,
          statBonuses: { dexterity: 1, luck: 1 } as unknown as Prisma.InputJsonValue,
          abilitySkillId: skillIds[PET_SKILL.name]!,
        },
      },

      innateAbility: {
        create: {
          name: "Закалка странника",
          description: [
            "1 ур.: Не мёрзнет в пути.",
            "2 ур.: −1 к получаемому урону от стихий.",
            "3 ур.: На привале быстрее восстанавливает ОД.",
          ].join("\n"),
          currentRank: 2,
        },
      },

      characterSkills: {
        create: ACQUIRED_SKILLS.map((s) => ({ skillId: skillIds[s.name]! })),
      },

      reputations: {
        create: REPUTATION.filter((r) => raceByName.has(r.race)).map((r) => ({
          raceId: raceByName.get(r.race)!,
          value: r.value,
        })),
      },

      backpackSlots: {
        create: [
          { slotIndex: 0, itemName: "Походный паёк", itemType: "food" as const, quantity: 5, description: "Сухари и вяленое мясо." },
          { slotIndex: 1, itemName: "Зелье лечения", itemType: "potion" as const, quantity: 2, description: "Восстанавливает немного HP." },
          { slotIndex: 2, itemName: "Моток верёвки", itemType: "misc" as const, quantity: 1, description: "15 метров пеньковой верёвки." },
          { slotIndex: 3, itemName: "Карта окрестностей", itemType: "quest" as const, quantity: 1, description: "Помечены руины к востоку." },
        ],
      },
    },
  });

  console.log(`[demo] Персонаж создан (id=${character.id})`);

  // ── Снаряжение (ItemInstance по шаблонам каталога) ───────────────────────────
  let weaponInstanceId: string | null = null;
  let weaponName = "оружие";
  let weaponPrice: Prisma.Decimal | number = 50;

  for (const slot of EQUIPMENT) {
    const tmpl = await findTemplateByCategory(prisma, slot.category, slot.tier);
    if (!tmpl) {
      console.warn(`[demo] Шаблон для категории "${slot.category}" не найден — слот ${slot.location} пропущен.`);
      continue;
    }
    const inst = await prisma.itemInstance.create({
      data: {
        characterId: character.id,
        templateId: tmpl.id,
        location: slot.location as never,
        acquiredPrice: tmpl.referencePrice,
      },
    });
    if (slot.location === "equipped_weapon_right") {
      weaponInstanceId = inst.id;
      weaponName = tmpl.name;
      weaponPrice = tmpl.referencePrice;
    }
  }

  // Кастомный предмет без шаблона — демонстрация overrides JSON (free-text снаряжение).
  await prisma.itemInstance.create({
    data: {
      characterId: character.id,
      location: "equipped_weapon_left",
      overrides: {
        name: "Дубовый щит",
        tier: 1,
        description: "Самодельный круглый щит, обитый железом. +2 к броне.",
      } as Prisma.InputJsonValue,
    },
  });
  console.log("[demo] Снаряжение создано");

  // ── Валюта: обязательные транзакции с moneyTarget ────────────────────────────
  await prisma.currencyTransaction.create({
    data: {
      characterId: character.id,
      amountBronze: 200,
      moneyTarget: "Стартовый капитал",
      createdBy: owner.id,
    },
  });
  if (weaponInstanceId) {
    await prisma.currencyTransaction.create({
      data: {
        characterId: character.id,
        amountBronze: new Prisma.Decimal(weaponPrice).negated(),
        moneyTarget: `Покупка: ${weaponName}`,
        relatedItemInstanceId: weaponInstanceId,
        createdBy: owner.id,
      },
    });
  }

  // ── Классовый бонус (порог по Силе) ──────────────────────────────────────────
  const strClassIdx = classIndex(STATS.strength, DEFAULT_RULE_CONFIG.classThresholds);
  if (strClassIdx >= 0) {
    await prisma.classBonusRecord.create({
      data: {
        characterId: character.id,
        attribute: "strength",
        classIndex: strClassIdx,
        rollDiceFormula: "1D6",
        rolledValues: [4] as Prisma.InputJsonValue,
        rolledSum: 4,
        resultingEffect: "Класс по Силе пройден: +1 куб урона в ближнем бою (зафиксировано).",
      },
    });
  }

  // ── Аудит-лог (история изменений для будущего экрана) ────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { characterId: character.id, actorId: owner.id, action: "override", field: "apMax", oldValue: derived.apMax, newValue: 100 },
      { characterId: character.id, actorId: owner.id, action: "currency", field: "balanceBronze", oldValue: 0, newValue: 150 },
    ],
  });

  console.log("[demo] Готово.");
}

// CLI: точечный запуск (pnpm --filter @gob/db exec tsx src/seed/character-demo.ts).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  seedDemoCharacter(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
