import { Decimal } from "@prisma/client/runtime/library";
import {
  ITEM_TEMPLATE_COLUMN_MAP,
  SLOT_TYPE_MAP,
  STAT_ATTRIBUTE_MAP,
  StatBonusesSchema,
  WEAPON_FAMILY_MAP,
  type StatBonuses,
} from "./csv-mapping.js";

export interface ParsedItemTemplate {
  name: string;
  slotType: string;
  weaponFamily: string | null;
  isTwoHanded: boolean;
  tier: number;
  requiredAttribute: string | null;
  damageDice: string | null;
  bonusCritDice: string | null;
  scalingAttribute: string | null;
  scalingCoefficient: Decimal | null;
  statBonuses: StatBonuses | null;
  hungerRestored: number | null;
  referencePrice: Decimal;
  description: string | null;
}

type RawRow = Record<string, string>;

export function parsePriceToBronze(raw: string): Decimal {
  const s = raw.trim().toLowerCase();
  const num = parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  if (s.includes("gold")) return new Decimal(num).mul(100);
  if (s.includes("silver")) return new Decimal(num).mul(10);
  return new Decimal(num);
}

function col(key: keyof typeof ITEM_TEMPLATE_COLUMN_MAP): string {
  // return the Russian column header
  return key;
}

function mapWeaponFamily(raw: string): string | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  const mapped = WEAPON_FAMILY_MAP[key];
  if (!mapped) {
    console.warn(`[seed] unknown weapon_family: "${raw}" — skipping field`);
    return null;
  }
  return mapped;
}

function mapSlotType(raw: string): string | null {
  if (!raw?.trim()) return null;
  return SLOT_TYPE_MAP[raw.trim().toLowerCase()] ?? null;
}

function mapStatAttribute(raw: string): string | null {
  if (!raw?.trim()) return null;
  return STAT_ATTRIBUTE_MAP[raw.trim().toLowerCase()] ?? null;
}

function buildStatBonuses(row: RawRow): StatBonuses | null {
  const b: StatBonuses = {};
  const hp = parseInt(row[col("Бонус HP")] ?? "");
  const dodge = parseInt(row[col("Бонус уворота")] ?? "");
  const armor = parseInt(row[col("Бонус брони")] ?? "");
  const bubble = parseInt(row[col("Шанс бабла, %")] ?? "");

  if (!isNaN(hp) && hp !== 0) b.hp = hp;
  if (!isNaN(dodge) && dodge !== 0) b.dodge = dodge;
  if (!isNaN(armor) && armor !== 0) b.armor = armor;
  if (!isNaN(bubble) && bubble !== 0) b.bubble_chance_pct = bubble;

  if (Object.keys(b).length === 0) return null;
  return StatBonusesSchema.parse(b);
}

export function parseItemTemplates(csvContent: string): ParsedItemTemplate[] {
  // lazy import — csv-parse is a dev dep only needed at seed time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parse } = require("csv-parse/sync") as typeof import("csv-parse/sync");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawRow[];

  const results: ParsedItemTemplate[] = [];

  for (const row of records) {
    const name = row[col("Название")]?.trim();
    if (!name) continue;

    const rawSlot = row[col("Слот")] ?? "";
    const slotType = mapSlotType(rawSlot);
    if (!slotType) {
      console.warn(`[seed] unknown slot_type "${rawSlot}" for item "${name}" — skipping row`);
      continue;
    }

    const tierRaw = parseInt(row[col("Тир")] ?? "1");
    const tier = isNaN(tierRaw) ? 1 : tierRaw;

    const isTwoHandedRaw = (row[col("Двуручное")] ?? "").trim().toLowerCase();
    const isTwoHanded = isTwoHandedRaw === "да" || isTwoHandedRaw === "true" || isTwoHandedRaw === "1";

    const scalingCoeffRaw = row[col("Коэфф. масштаба")]?.trim();
    const scalingCoeff = scalingCoeffRaw ? new Decimal(scalingCoeffRaw) : null;

    const hungerRaw = parseInt(row[col("Восст. голода")] ?? "");

    results.push({
      name,
      slotType,
      weaponFamily: mapWeaponFamily(row[col("Семейство")] ?? ""),
      isTwoHanded,
      tier,
      requiredAttribute: mapStatAttribute(row[col("Требуемая хар.")] ?? ""),
      damageDice: row[col("Кубы урона")]?.trim() || null,
      bonusCritDice: row[col("Куб крита")]?.trim() || null,
      scalingAttribute: mapStatAttribute(row[col("Масштаб. хар.")] ?? ""),
      scalingCoefficient: scalingCoeff,
      statBonuses: buildStatBonuses(row),
      hungerRestored: isNaN(hungerRaw) ? null : hungerRaw,
      referencePrice: parsePriceToBronze(row[col("Цена (справ.)")] ?? "0"),
      description: row[col("Описание")]?.trim() || null,
    });
  }

  return results;
}
