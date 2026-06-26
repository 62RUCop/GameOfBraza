import { describe, expect, it } from "vitest";
import { ITEM_TEMPLATES, type ItemTemplateSeed } from "../Gob_markets.js";

// Каталог теперь — статические TS-данные (ранее парсились из Gob_markets.csv).
// Тест охраняет целостность перенесённых данных: количество, уникальность ключей,
// границы тиров и корректность десятичных-строк. Конкретные значения — те же
// спот-чеки, что раньше проверялись на распарсенном CSV.

const byName = (name: string): ItemTemplateSeed | undefined =>
  ITEM_TEMPLATES.find((i) => i.name === name);

describe("ITEM_TEMPLATES (static catalog)", () => {
  it("содержит ровно 112 шаблонов", () => {
    expect(ITEM_TEMPLATES).toHaveLength(112);
  });

  it("имена уникальны (натуральный ключ upsert)", () => {
    const names = ITEM_TEMPLATES.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("все тиры в диапазоне 1..4", () => {
    for (const item of ITEM_TEMPLATES) {
      expect(item.tier).toBeGreaterThanOrEqual(1);
      expect(item.tier).toBeLessThanOrEqual(4);
    }
  });

  it("десятичные хранятся валидными числовыми строками", () => {
    for (const item of ITEM_TEMPLATES) {
      expect(item.referencePrice).toMatch(/^\d+(\.\d+)?$/);
      if (item.scalingCoefficient !== null) {
        expect(item.scalingCoefficient).toMatch(/^\d+(\.\d+)?$/);
      }
    }
  });
});

describe("спот-чеки значений (сохранены при переносе из CSV)", () => {
  it("цена нормализована в бронзу: 8.4 серебряных → 84", () => {
    expect(byName("Сила Двуручный Тир 3")?.referencePrice).toBe("84");
  });

  it("еда: цена 12 бронзы + 11 голода", () => {
    const food = byName("Еда Тир 4");
    expect(food?.referencePrice).toBe("12");
    expect(food?.hungerRestored).toBe(11);
  });

  it("масштабирование силового двуручника: коэффициент 1", () => {
    expect(byName("Сила Двуручный Тир 1")?.scalingCoefficient).toBe("1");
  });

  it("ловкие одноручники несут бонус уворота +1", () => {
    expect(byName("Ловкость Одноручный Тир 1")?.statBonuses).toEqual({ dodge: 1 });
  });

  it("урон и крит-кубик у двуручника силы тир 4", () => {
    const item = byName("Сила Двуручный Тир 4");
    expect(item?.damageDice).toBe("4D8");
  });
});
