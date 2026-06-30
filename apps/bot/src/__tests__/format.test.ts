import { describe, it, expect } from "vitest";
import type {
  BubbleRollOutcome,
  CharacterSummary,
  InventorySummary,
  MoneySummary,
  WeaponScaling,
} from "@gob/core";
import {
  formatAttackRoll,
  formatBubbleRoll,
  formatCheckRoll,
  formatDamageRoll,
  formatInventory,
  formatMoney,
  formatPlainRoll,
  formatSummary,
} from "../format";

const base: CharacterSummary = {
  id: "c1",
  name: "Бранд Серый",
  raceName: "Человек",
  hp: { current: 10, max: 12 },
  mana: { current: 30, max: 30 },
  ap: { current: 20, max: 30 },
  satiety: 5,
  attributes: { str: 3, dex: 4, int: 5, spi: 6, end: 7, luc: 8 },
};

describe("formatSummary", () => {
  it("содержит имя, расу и ресурсы", () => {
    const text = formatSummary(base);
    expect(text).toContain("Бранд Серый · Человек");
    expect(text).toContain("HP: 10/12");
    expect(text).toContain("Мана: 30/30");
    expect(text).toContain("ОД: 20/30");
    expect(text).toContain("Сытость: 5");
    expect(text).toContain("СИЛ 3");
  });

  it("без расы — в шапке только имя", () => {
    const text = formatSummary({ ...base, raceName: null });
    const head = text.split("\n")[0];
    expect(head).toBe("👤 Бранд Серый");
  });

  it("оверхил помечается нейтрально, а не как ошибка (§ золотое правило 1)", () => {
    const text = formatSummary({ ...base, hp: { current: 20, max: 12 } });
    expect(text).toContain("HP: 20/12 (вне расчётных рамок)");
  });

  it("отрицательное значение тоже помечается", () => {
    const text = formatSummary({ ...base, hp: { current: -3, max: 12 } });
    expect(text).toContain("HP: -3/12 (вне расчётных рамок)");
  });
});

describe("formatMoney", () => {
  const money: MoneySummary = {
    characterId: "c1",
    characterName: "Бранд Серый",
    bronze: 1234,
    display: { gold: 1, silver: 2, bronze: 34 },
  };

  it("показывает имя, номиналы и нормализованный итог", () => {
    const text = formatMoney(money);
    expect(text).toContain("Баланс — Бранд Серый");
    expect(text).toContain("1 зол · 2 сер · 34 бр");
    expect(text).toContain("Σ 1234 бронзы");
  });

  it("нулевой баланс выводится без ошибок", () => {
    const text = formatMoney({ ...money, bronze: 0, display: { gold: 0, silver: 0, bronze: 0 } });
    expect(text).toContain("0 зол · 0 сер · 0 бр");
    expect(text).toContain("Σ 0 бронзы");
  });
});

describe("formatInventory", () => {
  const inv: InventorySummary = {
    characterId: "c1",
    characterName: "Бранд Серый",
    equipped: [
      { location: "equipped_body", name: "Кольчуга", tier: 2 },
      { location: "equipped_weapon_right", name: "Меч", tier: 3 },
    ],
    backpack: [
      { name: "Зелье лечения", quantity: 2 },
      { name: "Факел", quantity: 1 },
    ],
  };

  it("оружие идёт раньше брони (заданный порядок слотов)", () => {
    const text = formatInventory(inv);
    const swordAt = text.indexOf("Меч");
    const armorAt = text.indexOf("Кольчуга");
    expect(swordAt).toBeGreaterThan(-1);
    expect(swordAt).toBeLessThan(armorAt);
  });

  it("слот, имя и тир", () => {
    const text = formatInventory(inv);
    expect(text).toContain("Оружие (прав.): Меч · Т3");
    expect(text).toContain("Тело: Кольчуга · Т2");
  });

  it("количество >1 показывается, =1 — нет", () => {
    const text = formatInventory(inv);
    expect(text).toContain("Зелье лечения ×2");
    expect(text).toContain("• Факел");
    expect(text).not.toContain("Факел ×1");
  });

  it("пустой инвентарь — нейтральные заглушки", () => {
    const text = formatInventory({ ...inv, equipped: [], backpack: [] });
    expect(text).toContain("— ничего не надето");
    expect(text).toContain("— пусто");
  });

  it("тир может отсутствовать", () => {
    const text = formatInventory({
      ...inv,
      equipped: [{ location: "equipped_amulet", name: "Амулет странника", tier: null }],
    });
    expect(text).toContain("Амулет: Амулет странника");
    expect(text).not.toContain("Амулет странника · Т");
  });
});

describe("formatPlainRoll", () => {
  it("один куб — без суммы и без маркеров", () => {
    const text = formatPlainRoll(20, [13]);
    expect(text).toContain("🎲 d20");
    expect(text).toContain("13");
    expect(text).not.toContain("Σ");
  });

  it("несколько кубов — сумма и маркеры мин/макс", () => {
    const text = formatPlainRoll(6, [2, 5, 3]);
    expect(text).toContain("🎲 3d6");
    expect(text).toContain("5 🔺");
    expect(text).toContain("2 🔻");
    expect(text).toContain("Σ 10");
  });
});

describe("formatCheckRoll", () => {
  // d20, СИЛ 12
  it("успех при значении ≤ характеристики", () => {
    expect(formatCheckRoll("str", 12, 20, [8])).toContain("✅ Успех");
  });
  it("натуральная 1 — критический успех", () => {
    expect(formatCheckRoll("str", 12, 20, [1])).toContain("🌟 Критический успех");
  });
  it("максимальная грань — критический провал", () => {
    expect(formatCheckRoll("str", 12, 20, [20])).toContain("💀 Критический провал");
  });
  it("выше характеристики, но не максимум — обычный провал", () => {
    expect(formatCheckRoll("str", 12, 20, [15])).toContain("❌ Провал");
  });
  it("несколько кубов — исход на каждый + маркеры", () => {
    const text = formatCheckRoll("dex", 10, 20, [4, 18]);
    expect(text).toContain("4 🔻");
    expect(text).toContain("18 🔺");
    expect(text).toContain("4: ✅ Успех");
    expect(text).toContain("18: ❌ Провал");
  });
});

describe("formatAttackRoll", () => {
  // d20, ЛОВ 4, крит-мод 1 → попадание ≥15, крит ≥19
  it("обычное попадание", () => {
    expect(formatAttackRoll(4, 1, 20, [17])).toContain("🎯 Попадание");
  });
  it("критическое попадание на крит-пороге", () => {
    expect(formatAttackRoll(4, 1, 20, [19])).toContain("💥 Критическое попадание");
  });
  it("промах ниже порога попадания", () => {
    expect(formatAttackRoll(4, 1, 20, [10])).toContain("❌ Промах");
  });
  it("критический промах: крит без попадания (высокая удача, низкая ловкость)", () => {
    // ЛОВ 0, крит-мод 5 → попадание ≥19, крит ≥15; бросок 16 → крит, но не попал
    const text = formatAttackRoll(0, 5, 20, [16]);
    expect(text).toContain("✨ Критический промах");
  });
  it("шапка показывает пороги", () => {
    const text = formatAttackRoll(4, 1, 20, [17]);
    expect(text).toContain("попадание ≥15");
    expect(text).toContain("крит ≥19");
  });
  it("натуральная 1 — антикрит (попадание по союзнику) + подсказка про урон", () => {
    const text = formatAttackRoll(4, 1, 20, [1]);
    expect(text).toContain("⚡ Антикрит — попадание по союзнику");
    expect(text).toContain("кинь урон по союзнику");
    expect(text).toContain("крит-кубы не работают");
  });
  it("без натуральной 1 подсказки про антикрит нет", () => {
    expect(formatAttackRoll(4, 1, 20, [17])).not.toContain("Антикрит");
  });
});

describe("formatDamageRoll", () => {
  it("суммирует кубы", () => {
    const text = formatDamageRoll(6, [3, 4, 5], []);
    expect(text).toContain("3 + 4 + 5 = 12");
  });
  it("показывает доп. урон от характеристики надетого оружия (не входит в сумму)", () => {
    const weapons: WeaponScaling[] = [
      { name: "Двуручный меч", hand: "right", attribute: "str", coefficient: 1, statValue: 10, bonus: 10 },
    ];
    const text = formatDamageRoll(6, [3, 4], weapons);
    expect(text).toContain("не входит в сумму");
    expect(text).toContain("Двуручный меч: СИЛ 10 × 1 → +10");
  });
  it("оружие без масштабирования помечается отдельно", () => {
    const weapons: WeaponScaling[] = [
      { name: "Палка", hand: "left", attribute: null, coefficient: null, statValue: null, bonus: null },
    ];
    expect(formatDamageRoll(6, [2], weapons)).toContain("Палка: без масштабирования урона");
  });
});

describe("formatBubbleRoll", () => {
  const base: BubbleRollOutcome = {
    rolled: 12,
    threshold: 30,
    fell: false,
    previousCharges: 3,
    charges: 2,
    spirit: 4,
  };

  it("устоявший бабл: показывает убыль заряда", () => {
    const text = formatBubbleRoll(base);
    expect(text).toContain("✅ Бабл устоял");
    expect(text).toContain("3 → 2");
  });

  it("спавший бабл: заряды → 0", () => {
    const text = formatBubbleRoll({ ...base, rolled: 55, fell: true, charges: 0 });
    expect(text).toContain("💨 Бабл спал");
    expect(text).toContain("3 → 0");
  });

  it("индикатор духа ≥ 6 при падении", () => {
    const text = formatBubbleRoll({ ...base, rolled: 55, fell: true, charges: 0, spirit: 7 });
    expect(text).toContain("Дух 7 ≥ 6");
  });

  it("индикатора нет при духе < 6", () => {
    const text = formatBubbleRoll({ ...base, rolled: 55, fell: true, charges: 0, spirit: 4 });
    expect(text).not.toContain("≥ 6");
  });
});
