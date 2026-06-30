import type {
  BubbleRollOutcome,
  CharacterSummary,
  InventorySummary,
  MoneySummary,
  RuntimeResource,
  WeaponScaling,
} from "@gob/core";
import { attributeCheckOutcome, checkHit, type CheckOutcome } from "@gob/rules";
import type { AttrKey } from "./roll";

const n = (x: number): string => String(x);

/** Полные подписи характеристик (как в сводке `/me`). */
const ATTR_LABELS: Record<AttrKey, string> = {
  str: "СИЛ",
  dex: "ЛОВ",
  int: "ИНТ",
  spi: "ДУХ",
  end: "ВЫН",
  luc: "УДЧ",
};

/** Порог духа, при котором Бабл не остаётся на 0 насовсем (индикатор, § уточнение заказчика). */
const BUBBLE_SPIRIT_FLOOR = 6;

/** Подписи слотов снаряжения (те же, что в листе на вебе). */
const SLOT_LABELS: Record<string, string> = {
  equipped_head: "Голова",
  equipped_body: "Тело",
  equipped_legs: "Ноги",
  equipped_vambraces: "Наручи",
  equipped_weapon_left: "Оружие (лев.)",
  equipped_weapon_right: "Оружие (прав.)",
  equipped_ring: "Кольцо",
  equipped_amulet: "Амулет",
  equipped_pet: "Питомец",
};

/** Порядок вывода надетого снаряжения (оружие → броня → бижутерия → питомец). */
const EQUIPPED_ORDER: Record<string, number> = {
  equipped_weapon_right: 0,
  equipped_weapon_left: 1,
  equipped_head: 2,
  equipped_body: 3,
  equipped_legs: 4,
  equipped_vambraces: 5,
  equipped_ring: 6,
  equipped_amulet: 7,
  equipped_pet: 8,
};

/** Иконка и подпись ресурса для сообщений бота. */
export const RESOURCE_META: Record<RuntimeResource, { icon: string; label: string }> = {
  hp: { icon: "❤️", label: "HP" },
  mana: { icon: "🔵", label: "Мана" },
  ap: { icon: "⚡", label: "ОД" },
};

/**
 * Строка ресурса `cur/max`. § золотое правило 1: оверхил, отрицательные значения и выход
 * за расчётный максимум — НЕ ошибка, а нейтральная пометка «в игре что-то произошло».
 */
export function resourceLine(icon: string, label: string, cur: number, max: number): string {
  const note = cur > max || cur < 0 ? " (вне расчётных рамок)" : "";
  return `${icon} ${label}: ${n(cur)}/${n(max)}${note}`;
}

/** Одна строка состояния ресурса (для ответа на `/hp`/`/mana`/`/ap` и инлайн-кнопки). */
export function formatResourceState(resource: RuntimeResource, cur: number, max: number): string {
  const m = RESOURCE_META[resource];
  return resourceLine(m.icon, m.label, cur, max);
}

/** Человекочитаемая сводка листа для ответа на `/me`. Чистая функция (без Telegram-зависимостей). */
export function formatSummary(s: CharacterSummary): string {
  const a = s.attributes;
  const head = s.raceName ? `👤 ${s.name} · ${s.raceName}` : `👤 ${s.name}`;
  return [
    head,
    "",
    resourceLine("❤️", "HP", s.hp.current, s.hp.max),
    resourceLine("🔵", "Мана", s.mana.current, s.mana.max),
    resourceLine("⚡", "ОД", s.ap.current, s.ap.max),
    `🍖 Сытость: ${n(s.satiety)}`,
    "",
    `СИЛ ${n(a.str)} · ЛОВ ${n(a.dex)} · ИНТ ${n(a.int)} · ДУХ ${n(a.spi)} · ВЫН ${n(a.end)} · УДЧ ${n(a.luc)}`,
  ].join("\n");
}

/** Баланс для ответа на `/money`. Номиналы считает `@gob/rules`, тут — только отрисовка. */
export function formatMoney(s: MoneySummary): string {
  const { gold, silver, bronze } = s.display;
  return [
    `💰 Баланс — ${s.characterName}`,
    `🪙 ${n(gold)} зол · ${n(silver)} сер · ${n(bronze)} бр`,
    `Σ ${n(s.bronze)} бронзы`,
  ].join("\n");
}

/** Инвентарь для ответа на `/bag`: надетое снаряжение + рюкзак. Чистая функция. */
export function formatInventory(s: InventorySummary): string {
  const lines: string[] = [`🎒 Инвентарь — ${s.characterName}`, "", "⚔️ Надето:"];

  if (s.equipped.length === 0) {
    lines.push("— ничего не надето");
  } else {
    const ordered = [...s.equipped].sort(
      (a, b) => (EQUIPPED_ORDER[a.location] ?? 99) - (EQUIPPED_ORDER[b.location] ?? 99),
    );
    for (const it of ordered) {
      const label = SLOT_LABELS[it.location] ?? it.location;
      const tier = it.tier != null ? ` · Т${n(it.tier)}` : "";
      lines.push(`• ${label}: ${it.name}${tier}`);
    }
  }

  lines.push("", "📦 Рюкзак:");
  if (s.backpack.length === 0) {
    lines.push("— пусто");
  } else {
    for (const b of s.backpack) {
      const qty = b.quantity > 1 ? ` ×${n(b.quantity)}` : "";
      lines.push(`• ${b.name}${qty}`);
    }
  }

  return lines.join("\n");
}

// ─── /roll ──────────────────────────────────────────────────────────────────

/** Нотация куба для шапки: `2d20` либо `d20` (один куб). */
function diceNotation(count: number, faces: number): string {
  return count > 1 ? `${n(count)}d${n(faces)}` : `d${n(faces)}`;
}

/**
 * Значения кубов строкой; при нескольких выделяет максимум (🔺) и минимум (🔻) — для бросков
 * с преимуществом/помехой игрок сам берёт нужный (атака — больше лучше, проверка — меньше).
 */
function diceValues(rolls: number[]): string {
  if (rolls.length === 1) return n(rolls[0] ?? 0);
  const max = Math.max(...rolls);
  const min = Math.min(...rolls);
  return rolls
    .map((r) => (max !== min && r === max ? `${n(r)} 🔺` : max !== min && r === min ? `${n(r)} 🔻` : n(r)))
    .join(", ");
}

/** Обычный бросок кубов без семантики (`/roll 20`, `/roll 3d6`). */
export function formatPlainRoll(faces: number, rolls: number[]): string {
  const lines = [`🎲 ${diceNotation(rolls.length, faces)}`, diceValues(rolls)];
  if (rolls.length > 1) {
    lines.push(`Σ ${n(rolls.reduce((a, b) => a + b, 0))}`);
  }
  return lines.join("\n");
}

const CHECK_OUTCOME_LABEL: Record<CheckOutcome, string> = {
  crit_success: "🌟 Критический успех",
  success: "✅ Успех",
  failure: "❌ Провал",
  crit_fail: "💀 Критический провал",
};

/** Проверка характеристики (`/roll STR 12`): меньше — лучше; исход на каждый куб. */
export function formatCheckRoll(attribute: AttrKey, statValue: number, faces: number, rolls: number[]): string {
  const label = ATTR_LABELS[attribute];
  const lines = [
    `🎯 Проверка ${label} · ${diceNotation(rolls.length, faces)} (${label} ${n(statValue)})`,
    diceValues(rolls),
  ];
  for (const r of rolls) {
    const outcome = CHECK_OUTCOME_LABEL[attributeCheckOutcome(r, faces, statValue)];
    lines.push(rolls.length === 1 ? outcome : `${n(r)}: ${outcome}`);
  }
  lines.push(`1 — крит-успех · ≤${n(statValue)} — успех · ${n(faces)} — крит-провал · меньше лучше`);
  return lines.join("\n");
}

/**
 * Метка исхода атаки. Приоритет — натуральная 1 (антикрит, § ТЗ 3.4): возможно попадание по
 * союзнику, перебивает обычный исход. Дальше: крит без попадания — критический промах (высокая
 * удача, низкая ловкость).
 */
function attackLabel(hit: boolean, crit: boolean, critFail: boolean): string {
  if (critFail) return "⚡ Антикрит — попадание по союзнику";
  if (crit && hit) return "💥 Критическое попадание";
  if (crit) return "✨ Критический промах";
  if (hit) return "🎯 Попадание";
  return "❌ Промах";
}

/** Бросок атаки (`/roll ATK 2d20`): попадание + крит; больше — лучше. */
export function formatAttackRoll(dex: number, critBonus: number, faces: number, rolls: number[]): string {
  const hitThreshold = faces - 1 - dex;
  const critThreshold = faces - critBonus;
  const lines = [
    `⚔️ Атака · ${diceNotation(rolls.length, faces)} (ЛОВ ${n(dex)}, крит-мод ${n(critBonus)})`,
    diceValues(rolls),
  ];
  for (const r of rolls) {
    const { hit, crit, critFail } = checkHit(r, faces, dex, critBonus);
    const label = attackLabel(hit, crit, critFail);
    lines.push(rolls.length === 1 ? label : `${n(r)}: ${label}`);
  }
  lines.push(`попадание ≥${n(hitThreshold)} · крит ≥${n(critThreshold)} · больше лучше`);
  if (rolls.some((r) => r === 1)) {
    lines.push("⚡ Натуральная 1 = антикрит: кинь урон по союзнику как обычное попадание (крит-кубы не работают).");
  }
  return lines.join("\n");
}

/** Бросок урона (`/roll DMG 3d6`): сумма кубов + доп. урон от характеристики надетого оружия. */
export function formatDamageRoll(faces: number, rolls: number[], weapons: WeaponScaling[]): string {
  const sum = rolls.reduce((a, b) => a + b, 0);
  const lines = [
    `🗡 Урон · ${diceNotation(rolls.length, faces)}`,
    `🎲 ${rolls.map(n).join(" + ")} = ${n(sum)}`,
  ];
  if (weapons.length > 0) {
    lines.push("", "Доп. урон от характеристики (не входит в сумму):");
    for (const w of weapons) {
      if (w.bonus != null && w.attribute != null && w.coefficient != null && w.statValue != null) {
        lines.push(`• ${w.name}: ${ATTR_LABELS[w.attribute]} ${n(w.statValue)} × ${n(w.coefficient)} → +${n(w.bonus)}`);
      } else {
        lines.push(`• ${w.name}: без масштабирования урона`);
      }
    }
  }
  return lines.join("\n");
}

/** Бросок Бабла (`/roll BBL`): d100, исход + изменение зарядов (состояние уже записано). */
export function formatBubbleRoll(o: BubbleRollOutcome): string {
  const lines = [
    "🫧 Бабл · d100",
    `🎲 ${n(o.rolled)} · порог ${n(o.threshold)} (${n(o.previousCharges)} зар.)`,
  ];
  if (o.fell) {
    lines.push(`${n(o.rolled)} ≥ ${n(o.threshold)} → 💨 Бабл спал (заряды: ${n(o.previousCharges)} → 0)`);
    if (o.spirit >= BUBBLE_SPIRIT_FLOOR) {
      lines.push(`🛡 Дух ${n(o.spirit)} ≥ ${n(BUBBLE_SPIRIT_FLOOR)}: на 0 насовсем не остаётся — восстановится.`);
    }
  } else {
    lines.push(`${n(o.rolled)} < ${n(o.threshold)} → ✅ Бабл устоял (заряды: ${n(o.previousCharges)} → ${n(o.charges)})`);
  }
  return lines.join("\n");
}
