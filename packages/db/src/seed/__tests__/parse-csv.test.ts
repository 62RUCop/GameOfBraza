import { describe, expect, it, test, vi } from "vitest";
import { parseItemTemplates, parsePriceToBronze } from "../parse-csv.js";
import { loadItemTemplatesFromCsv } from "../item-templates.js";

// ─── helpers ──────────────────────────────────────────────────────────────────
// parseDescription/parseCellDescription приватные — гоняем их через публичный
// parseItemTemplates, собирая минимальный CSV с одной категорией и одной ячейкой
// в строке «Тир 1». Парсер пропускает пустые ячейки, так что остальные тиры пусты.

function buildCsv(category: string, cell: string): string {
  return [`Тиры;${category}`, `Тир 1;${cell}`, "Тир 2;", "Тир 3;", "Тир 4;"].join("\n");
}

/** Распарсить одну ячейку категории и вернуть единственный шаблон. */
function parseCell(category: string, cell: string) {
  return parseItemTemplates(buildCsv(category, cell))[0];
}

// ─── price parsing ──────────────────────────────────────────────────────────
// 1 золото = 10 серебра = 100 бронзы; число — первый float в строке.

describe("parsePriceToBronze", () => {
  test.each<[string, number]>([
    ["2 бронзовых", 2],
    ["1 бронзовый", 1],
    ["1 серебряный", 10], // ×10
    ["1.2 серебряных", 12], // десятичные: 1.2 × 10
    ["8.4 серебряных", 84], // 8.4 × 10
    ["0.5 серебряных", 5],
    ["1 золотой", 100], // ×100
    ["1.7 Золотой", 170], // десятичные + заглавная (регистронезависимо)
    ["3", 3], // без единицы → бронза
  ])("%s → %i bronze", (raw, expected) => {
    expect(parsePriceToBronze(raw).toNumber()).toBe(expected);
  });
});

// ─── damage dice + bonus crit dice ────────────────────────────────────────────

describe("damage dice extraction", () => {
  it("plain die, no crit → damageDice only", () => {
    const item = parseCell("Сила Одноручный", "1 Серебряный (1D6)");
    expect(item?.damageDice).toBe("1D6");
    expect(item?.bonusCritDice).toBeNull();
  });

  it("'N куб. крита' → bonus crit dice reuse the damage die faces", () => {
    const item = parseCell("Сила Двуручный", "1 Золотой (4D6 + 2 куб. крита)");
    expect(item?.damageDice).toBe("4D6");
    expect(item?.bonusCritDice).toBe("2D6");
  });

  it("'N крит куб' variant is recognised too", () => {
    const item = parseCell("Лук Одноручный", "1.1 Серебрянный (1D4 + 1 крит куб)");
    expect(item?.damageDice).toBe("1D4");
    expect(item?.bonusCritDice).toBe("1D4");
  });

  it("crit dice without a base damage die are ignored", () => {
    // bonusCritDice заполняется только при наличии базового кубика урона
    const item = parseCell("Расходники", "1 Серебряный (2 куб. крита)");
    expect(item?.damageDice).toBeNull();
    expect(item?.bonusCritDice).toBeNull();
  });
});

// ─── stat bonuses ─────────────────────────────────────────────────────────────

describe("stat bonuses", () => {
  it("hp: 'доп хп 12'", () => {
    expect(parseCell("Латы", "5 Серебряных (доп хп 12)")?.statBonuses).toEqual({ hp: 12 });
  });

  it("armor: '3 защиты'", () => {
    expect(parseCell("Щит", "7 Бронзовых (3 защиты)")?.statBonuses).toEqual({ armor: 3 });
  });

  it("bubble: '+30% buble chance' (CSV-опечатка 'buble' учтена)", () => {
    expect(parseCell("Мантия", "2 Золотых (+30% buble chance)")?.statBonuses).toEqual({
      bubble_chance_pct: 30,
    });
  });

  it("dodge '+N к увороту' combines with hp in one cell", () => {
    expect(parseCell("Плащи", "1 Серебряный (+1 к увороту, доп хп 3)")?.statBonuses).toEqual({
      hp: 3,
      dodge: 1,
    });
  });

  it("dodge 'N уворот' form", () => {
    expect(parseCell("Ловкость Двуручный", "8 Серебрянных (4D6 + 2 уворот)")?.statBonuses).toEqual({
      dodge: 2,
    });
  });

  // Голое «уворот» без числа → dodge 1 (см. комментарий в parse-csv.ts:
  // «bare "уворот" (implicit 1)»). Фоллбэк-ветка использует /уворот/i, а не
  // /\bуворот\b/: JS \b ASCII-only и на кириллице не образует границу слова.
  it("bare 'уворот' (implicit 1) → dodge 1", () => {
    expect(parseCell("Ловкость Одноручный", "8 Бронзовых (1D4 + уворот)")?.statBonuses).toEqual({
      dodge: 1,
    });
  });
});

// ─── food format (price / hunger split on "/") ────────────────────────────────

describe("food format", () => {
  it("'2 бронзовых / 1 голод' → price 2 bronze, hunger 1", () => {
    const food = parseCell("Еда", "2 бронзовых / 1 голод");
    expect(food?.referencePrice.toNumber()).toBe(2);
    expect(food?.hungerRestored).toBe(1);
    expect(food?.statBonuses).toBeNull();
  });

  it("decimal silver food price normalises to bronze", () => {
    const food = parseCell("Еда", "1.2 серебряных / 11 голода");
    expect(food?.referencePrice.toNumber()).toBe(12);
    expect(food?.hungerRestored).toBe(11);
  });
});

// ─── unknown category ─────────────────────────────────────────────────────────

describe("unknown category", () => {
  it("is skipped with a warning, not an exception", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const csv = ["Тиры;Несуществующая", "Тир 1;1 серебряный (1D6)", "Тир 2;", "Тир 3;", "Тир 4;"].join("\n");

    const rows = parseItemTemplates(csv);

    expect(rows).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("Несуществующая");
    warn.mockRestore();
  });
});

// ─── real file (Windows-1251 → iconv-lite) ────────────────────────────────────

describe("Gob_markets.csv (real file)", () => {
  it("yields exactly 112 templates with no unknown-category warnings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const items = loadItemTemplatesFromCsv();

    expect(items).toHaveLength(112);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("decodes cyrillic and prices correctly (spot checks)", () => {
    const items = loadItemTemplatesFromCsv();
    const byName = (name: string) => items.find((i) => i.name === name);

    // 8.4 серебряных → 84 бронзы
    expect(byName("Сила Двуручный Тир 3")?.referencePrice.toNumber()).toBe(84);

    // еда: «1.2 серебряных / 11 голода»
    const food = byName("Еда Тир 4");
    expect(food?.referencePrice.toNumber()).toBe(12);
    expect(food?.hungerRestored).toBe(11);
  });
});
