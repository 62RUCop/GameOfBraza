import { describe, expect, it } from "vitest";
import { parseRollArgs, rollDice, rollDie } from "../roll";

describe("parseRollArgs", () => {
  it("обычный бросок: одно число → один куб", () => {
    expect(parseRollArgs("20")).toEqual({ kind: "plain", dice: { count: 1, faces: 20 } });
  });

  it("обычный бросок: NdM", () => {
    expect(parseRollArgs("3d6")).toEqual({ kind: "plain", dice: { count: 3, faces: 6 } });
  });

  it("проверка характеристики: STR <кубы>", () => {
    expect(parseRollArgs("STR 12")).toEqual({
      kind: "check",
      attribute: "str",
      dice: { count: 1, faces: 12 },
    });
    expect(parseRollArgs("luc 2d20")).toEqual({
      kind: "check",
      attribute: "luc",
      dice: { count: 2, faces: 20 },
    });
  });

  it("обозначение регистронезависимо", () => {
    expect(parseRollArgs("atk d20")).toEqual({ kind: "attack", dice: { count: 1, faces: 20 } });
    expect(parseRollArgs("Dmg 3d6")).toEqual({ kind: "damage", dice: { count: 3, faces: 6 } });
  });

  it("BBL — без спецификации кубов (всегда d100)", () => {
    expect(parseRollArgs("BBL")).toEqual({ kind: "bubble" });
    expect(parseRollArgs("bbl что-то лишнее")).toEqual({ kind: "bubble" });
  });

  it("обозначение без кубов → null (подсказка)", () => {
    expect(parseRollArgs("STR")).toBeNull();
    expect(parseRollArgs("ATK")).toBeNull();
    expect(parseRollArgs("DMG")).toBeNull();
  });

  it("обозначение с мусором вместо кубов → null", () => {
    expect(parseRollArgs("STR abc")).toBeNull();
  });

  it("пустой ввод → null", () => {
    expect(parseRollArgs("")).toBeNull();
    expect(parseRollArgs("   ")).toBeNull();
  });

  it("неизвестный токен (не обозначение и не кубы) → null", () => {
    expect(parseRollArgs("xyz")).toBeNull();
  });
});

describe("rollDie / rollDice", () => {
  it("rollDie всегда в диапазоне 1..faces", () => {
    for (let i = 0; i < 200; i++) {
      const r = rollDie(6);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
      expect(Number.isInteger(r)).toBe(true);
    }
  });

  it("rollDice возвращает нужное число кубов в диапазоне", () => {
    const rolls = rollDice(5, 20);
    expect(rolls).toHaveLength(5);
    for (const r of rolls) {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
    }
  });

  it("d1 всегда 1", () => {
    expect(rollDie(1)).toBe(1);
  });
});
