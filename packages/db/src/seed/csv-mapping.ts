import { z } from "zod";

export const ITEM_TEMPLATE_COLUMN_MAP = {
  "Название": "name",
  "Слот": "slot_type",
  "Тир": "tier",
  "Семейство": "weapon_family",
  "Двуручное": "is_two_handed",
  "Требуемая хар.": "required_attribute",
  "Кубы урона": "damage_dice",
  "Куб крита": "bonus_crit_dice",
  "Масштаб. хар.": "scaling_attribute",
  "Коэфф. масштаба": "scaling_coefficient",
  "Бонус HP": "stat_bonuses.hp",
  "Бонус уворота": "stat_bonuses.dodge",
  "Бонус брони": "stat_bonuses.armor",
  "Шанс бабла, %": "stat_bonuses.bubble_chance_pct",
  "Восст. голода": "hunger_restored",
  "Цена (справ.)": "reference_price",
  "Описание": "description",
} as const;

export const SKILL_COLUMN_MAP = {
  "Название": "name",
  "Описание": "description",
  "Тир": "tier",
  "Тип": "skill_type",
  "Занимает ячейку": "occupies_slot",
  "Мана": "mana_cost",
  "ОД": "ap_cost",
  "Привязанная хар.": "tied_attribute",
  "Гильдия": "guild_id",
} as const;

export const WEAPON_FAMILY_MAP: Record<string, string> = {
  "сила одноручный": "STR_one_hand",
  "сила двуручный": "STR_two_hand",
  "ловкость одноручный": "DEX_one_hand",
  "лук": "DEX_bow",
  "арбалет": "DEX_crossbow",
  "посох": "staff",
  "колокольчик": "bell",
  "мантия": "mantle",
  "ряса": "robe",
  "латы": "plate",
  "кожаная броня": "leather",
  "еда": "food",
  "прочее": "misc",
};

export const SLOT_TYPE_MAP: Record<string, string> = {
  "голова": "head",
  "тело": "body",
  "ноги": "legs",
  "наручи": "vambraces",
  "левая рука": "weapon_left",
  "правая рука": "weapon_right",
  "кольцо": "ring",
  "амулет": "amulet",
  "питомец": "pet",
};

export const STAT_ATTRIBUTE_MAP: Record<string, string> = {
  "сила": "strength",
  "ловкость": "dexterity",
  "интеллект": "intelligence",
  "дух": "spirit",
  "выносливость": "endurance",
  "удача": "luck",
};

export const StatBonusesSchema = z.object({
  hp: z.number().optional(),
  dodge: z.number().optional(),
  armor: z.number().optional(),
  bubble_chance_pct: z.number().optional(),
}).strict();

export type StatBonuses = z.infer<typeof StatBonusesSchema>;
