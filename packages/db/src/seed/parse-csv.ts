import { Decimal } from "@prisma/client/runtime/library";
import { StatBonusesSchema, type StatBonuses } from "./csv-mapping.js";

// ─── Category config ─────────────────────────────────────────────────────────

interface CategoryConfig {
  weaponFamily: string;
  slotType: string;
  isTwoHanded: boolean;
  requiredAttribute: string | null;
  scalingAttribute: string | null;
  scalingCoefficient: Decimal | null;
}

const d = (v: string) => new Decimal(v);

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // Section 1 — consumables & misc
  "Еда":          { weaponFamily: "food",       slotType: "consumable", isTwoHanded: false, requiredAttribute: null,           scalingAttribute: null,           scalingCoefficient: null },
  "Расходники":   { weaponFamily: "consumable", slotType: "consumable", isTwoHanded: false, requiredAttribute: null,           scalingAttribute: null,           scalingCoefficient: null },
  "Одежда":       { weaponFamily: "clothing",   slotType: "body",       isTwoHanded: false, requiredAttribute: null,           scalingAttribute: null,           scalingCoefficient: null },
  "Инструменты":  { weaponFamily: "tool",       slotType: "consumable", isTwoHanded: false, requiredAttribute: null,           scalingAttribute: null,           scalingCoefficient: null },

  // Section 2 — melee
  "Сила Одноручный":   { weaponFamily: "STR_one_hand", slotType: "weapon_right", isTwoHanded: false, requiredAttribute: "strength",   scalingAttribute: "strength",   scalingCoefficient: d("0.5")  },
  "Сила Двуручный":    { weaponFamily: "STR_two_hand", slotType: "weapon_right", isTwoHanded: true,  requiredAttribute: "strength",   scalingAttribute: "strength",   scalingCoefficient: d("1.0")  },
  "Ловкость Одноручный": { weaponFamily: "DEX_one_hand", slotType: "weapon_right", isTwoHanded: false, requiredAttribute: "dexterity", scalingAttribute: "dexterity", scalingCoefficient: d("0.25") },
  "Ловкость Двуручный":  { weaponFamily: "DEX_two_hand", slotType: "weapon_right", isTwoHanded: true,  requiredAttribute: "dexterity", scalingAttribute: "dexterity", scalingCoefficient: d("0.5")  },
  "Щит":               { weaponFamily: "shield",       slotType: "weapon_left",  isTwoHanded: false, requiredAttribute: null,         scalingAttribute: null,         scalingCoefficient: null       },

  // Section 3 — ranged
  "Арбалет Одноручный": { weaponFamily: "DEX_crossbow", slotType: "weapon_right", isTwoHanded: false, requiredAttribute: "dexterity", scalingAttribute: "dexterity", scalingCoefficient: d("0.25") },
  "Арбалет Двуручный":  { weaponFamily: "DEX_crossbow", slotType: "weapon_right", isTwoHanded: true,  requiredAttribute: "dexterity", scalingAttribute: "dexterity", scalingCoefficient: d("0.5")  },
  "Лук Одноручный":     { weaponFamily: "DEX_bow",      slotType: "weapon_right", isTwoHanded: false, requiredAttribute: "dexterity", scalingAttribute: "dexterity", scalingCoefficient: d("0.25") },
  "Лук Двуручный":      { weaponFamily: "DEX_bow",      slotType: "weapon_right", isTwoHanded: true,  requiredAttribute: "dexterity", scalingAttribute: "dexterity", scalingCoefficient: d("0.5")  },
  "Стрелы":             { weaponFamily: "ammo",         slotType: "consumable",   isTwoHanded: false, requiredAttribute: null,         scalingAttribute: null,         scalingCoefficient: null       },

  // Section 4 — caster gear
  "Посох двуруч":        { weaponFamily: "staff",   slotType: "weapon_right", isTwoHanded: true,  requiredAttribute: "intelligence", scalingAttribute: "intelligence", scalingCoefficient: d("0.5")  },
  "Колокольчик одноруч": { weaponFamily: "bell",    slotType: "weapon_right", isTwoHanded: false, requiredAttribute: "spirit",       scalingAttribute: "spirit",       scalingCoefficient: d("0.5")  },
  "Мантия":              { weaponFamily: "mantle",  slotType: "body",         isTwoHanded: false, requiredAttribute: "intelligence", scalingAttribute: null,           scalingCoefficient: null       },
  "Ряса":                { weaponFamily: "robe",    slotType: "body",         isTwoHanded: false, requiredAttribute: "spirit",       scalingAttribute: null,           scalingCoefficient: null       },
  "Кольцо":              { weaponFamily: "ring",    slotType: "ring",         isTwoHanded: false, requiredAttribute: null,           scalingAttribute: null,           scalingCoefficient: null       },
  "Ожерелье":            { weaponFamily: "amulet",  slotType: "amulet",       isTwoHanded: false, requiredAttribute: null,           scalingAttribute: null,           scalingCoefficient: null       },

  // Section 5 — plate armor
  "Латы":            { weaponFamily: "plate", slotType: "body",      isTwoHanded: false, requiredAttribute: "strength", scalingAttribute: null, scalingCoefficient: null },
  "Сапоги (латные)": { weaponFamily: "plate", slotType: "legs",      isTwoHanded: false, requiredAttribute: "strength", scalingAttribute: null, scalingCoefficient: null },
  "Наручи (латные)": { weaponFamily: "plate", slotType: "vambraces", isTwoHanded: false, requiredAttribute: "strength", scalingAttribute: null, scalingCoefficient: null },
  "Шлем":            { weaponFamily: "plate", slotType: "head",      isTwoHanded: false, requiredAttribute: "strength", scalingAttribute: null, scalingCoefficient: null },

  // Section 6 — leather armor
  "Плащи":              { weaponFamily: "leather", slotType: "body",      isTwoHanded: false, requiredAttribute: "dexterity", scalingAttribute: null, scalingCoefficient: null },
  "Сапоги (кожаные)":   { weaponFamily: "leather", slotType: "legs",      isTwoHanded: false, requiredAttribute: "dexterity", scalingAttribute: null, scalingCoefficient: null },
  "Наручи (кожаные)":   { weaponFamily: "leather", slotType: "vambraces", isTwoHanded: false, requiredAttribute: "dexterity", scalingAttribute: null, scalingCoefficient: null },
  "Капюшон":            { weaponFamily: "leather", slotType: "head",      isTwoHanded: false, requiredAttribute: "dexterity", scalingAttribute: null, scalingCoefficient: null },
};

// ─── Price parsing ────────────────────────────────────────────────────────────

/**
 * Parse a price string in Russian denominations to normalized bronze.
 * Handles: "2 бронзовых", "1.5 серебряных", "1 золотой", "1.7 Золотой" etc.
 */
export function parsePriceToBronze(raw: string): Decimal {
  const s = raw.trim().toLowerCase();
  // Extract numeric part (first float in the string)
  const numMatch = s.match(/[\d.]+/);
  const num = numMatch ? parseFloat(numMatch[0]) : 0;
  if (s.match(/золот/)) return new Decimal(num).mul(100);
  if (s.match(/серебр/)) return new Decimal(num).mul(10);
  return new Decimal(num); // bronze or unitless
}

// ─── Description parsing ─────────────────────────────────────────────────────

interface ParsedDescription {
  damageDice: string | null;
  bonusCritDice: string | null;
  statBonuses: StatBonuses | null;
  hungerRestored: number | null;
  rawDescription: string;
}

function parseCellDescription(cell: string): { price: string; description: string } {
  const parenIdx = cell.indexOf("(");
  if (parenIdx === -1) {
    // Food format: "2 бронзовых / 1 голод" — split on /
    const slashIdx = cell.indexOf("/");
    if (slashIdx !== -1) {
      return {
        price: cell.slice(0, slashIdx).trim(),
        description: cell.slice(slashIdx + 1).trim(),
      };
    }
    return { price: cell.trim(), description: "" };
  }
  const closeIdx = cell.lastIndexOf(")");
  return {
    price: cell.slice(0, parenIdx).trim(),
    description: cell.slice(parenIdx + 1, closeIdx > parenIdx ? closeIdx : undefined).trim(),
  };
}

function parseDescription(desc: string): ParsedDescription {
  const raw = desc;
  let damageDice: string | null = null;
  let bonusCritDice: string | null = null;
  const bonuses: StatBonuses = {};

  // Damage dice — first NdX / NDX pattern (uppercase D used in CSV)
  const diceMatch = desc.match(/(\d+)[dDдД](\d+)/);
  if (diceMatch) {
    damageDice = `${diceMatch[1]}D${diceMatch[2]}`;
  }

  // Bonus crit dice: "N куб. крита", "N куб крита", "N крит куба"
  // Use same die type as damage dice
  const critMatch = desc.match(/(\d+)\s*(?:куб\.?\s*крита?|крит\.?\s*куба?)/i);
  if (critMatch && diceMatch) {
    bonusCritDice = `${critMatch[1]}D${diceMatch[2]}`;
  }

  // Armor: "N защиты" / "+N защит"
  const armorMatch = desc.match(/\+?(\d+)\s*защит[ыи]?/i);
  if (armorMatch?.[1]) bonuses.armor = parseInt(armorMatch[1]);

  // HP: "доп хп N"
  const hpMatch = desc.match(/доп\s*[хx][пp]\s*(\d+)/i);
  if (hpMatch?.[1]) bonuses.hp = parseInt(hpMatch[1]);

  // Dodge: "+N к увороту" | "N уворот" | bare "уворот" (implicit 1)
  const dodgeMatchN = desc.match(/\+?\s*(\d+)\s*к\s*увороту/i) ?? desc.match(/\+?\s*(\d+)\s*уворот/i);
  if (dodgeMatchN?.[1]) {
    bonuses.dodge = parseInt(dodgeMatchN[1]);
  } else if (/уворот/i.test(desc)) {
    // голое «уворот» без числа → подразумевается +1. Не используем \b: в JS
    // граница слова ASCII-only и на кириллице не срабатывает (числовые формы
    // уже отработаны веткой dodgeMatchN выше, так что фоллбэк безопасен).
    bonuses.dodge = 1;
  }

  // Bubble: "+N% buble chance" / "+N% bubble chance"
  const bubbleMatch = desc.match(/\+(\d+)%\s*bub[bl]e\s*chance/i);
  if (bubbleMatch?.[1]) bonuses.bubble_chance_pct = parseInt(bubbleMatch[1]);

  // Hunger from food: "N голод" in description (already split from price)
  const hungerMatch = desc.match(/(\d+)\s*голод/i);
  const hungerRestored = hungerMatch?.[1] ? parseInt(hungerMatch[1]) : null;

  const statBonuses =
    Object.keys(bonuses).length > 0 ? StatBonusesSchema.parse(bonuses) : null;

  return { damageDice, bonusCritDice, statBonuses, hungerRestored, rawDescription: raw };
}

// ─── Main export ─────────────────────────────────────────────────────────────

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

/**
 * Parse Gob_markets.csv — semicolon-delimited, multi-section horizontal layout.
 * Each section is separated by empty columns (;;).
 * Rows: header row + 4 tier rows (Тир 1–4).
 */
export function parseItemTemplates(csvContent: string): ParsedItemTemplate[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0]!;
  const tierLines = lines.slice(1, 5); // exactly 4 tier rows

  const headerCells = headerLine.split(";");
  const tierCells = tierLines.map((l) => l.split(";"));

  // Find section boundaries: columns where header is empty separate sections.
  // Each section starts with "Тиры" column, followed by category columns.
  const sections: Array<{ tierColIdx: number; categories: Array<{ name: string; colIdx: number }> }> = [];

  let i = 0;
  while (i < headerCells.length) {
    const h = headerCells[i]?.trim() ?? "";
    if (h.toLowerCase() === "тиры") {
      const categories: Array<{ name: string; colIdx: number }> = [];
      let j = i + 1;
      while (j < headerCells.length && (headerCells[j]?.trim() ?? "") !== "") {
        if ((headerCells[j]?.trim() ?? "").toLowerCase() !== "тиры") {
          categories.push({ name: headerCells[j]!.trim(), colIdx: j });
        }
        j++;
      }
      sections.push({ tierColIdx: i, categories });
      i = j;
    } else {
      i++;
    }
  }

  const results: ParsedItemTemplate[] = [];

  for (const section of sections) {
    for (const cat of section.categories) {
      const config = CATEGORY_CONFIG[cat.name];
      if (!config) {
        console.warn(`[seed] unknown category "${cat.name}" — skipping`);
        continue;
      }

      for (let tierIdx = 0; tierIdx < tierCells.length; tierIdx++) {
        const row = tierCells[tierIdx]!;
        const tierNum = tierIdx + 1;
        const cell = (row[cat.colIdx] ?? "").trim();
        if (!cell) continue;

        const { price, description } = parseCellDescription(cell);
        const referencePrice = parsePriceToBronze(price);
        const parsed = parseDescription(description);

        // For food, also try extracting hunger from the description side
        const hungerRestored =
          parsed.hungerRestored ??
          (() => {
            // food format: description part after / already has "N голод"
            const m = cell.match(/\/\s*(\d+)\s*голод/i);
            return m?.[1] ? parseInt(m[1]) : null;
          })();

        const name = `${cat.name} Тир ${tierNum}`;

        results.push({
          name,
          slotType: config.slotType,
          weaponFamily: config.weaponFamily,
          isTwoHanded: config.isTwoHanded,
          tier: tierNum,
          requiredAttribute: config.requiredAttribute,
          damageDice: parsed.damageDice,
          bonusCritDice: parsed.bonusCritDice,
          scalingAttribute: config.scalingAttribute,
          scalingCoefficient: config.scalingCoefficient,
          statBonuses: parsed.statBonuses,
          hungerRestored,
          referencePrice,
          description: parsed.rawDescription || null,
        });
      }
    }
  }

  return results;
}
