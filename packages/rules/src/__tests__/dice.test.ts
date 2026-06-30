import { describe, expect, it, test } from "vitest";
import { attributeCheckOutcome, MAX_DICE, parseDiceSpec } from "../dice.js";

describe("parseDiceSpec", () => {
  it("разбирает «NdM»", () => {
    expect(parseDiceSpec("3d6")).toEqual({ count: 3, faces: 6 });
    expect(parseDiceSpec("3D6")).toEqual({ count: 3, faces: 6 });
    expect(parseDiceSpec("2d20")).toEqual({ count: 2, faces: 20 });
  });

  it("«dM» — один куб", () => {
    expect(parseDiceSpec("d20")).toEqual({ count: 1, faces: 20 });
    expect(parseDiceSpec("D100")).toEqual({ count: 1, faces: 100 });
  });

  it("«M» (только число) — один куб", () => {
    expect(parseDiceSpec("20")).toEqual({ count: 1, faces: 20 });
    expect(parseDiceSpec("4")).toEqual({ count: 1, faces: 4 });
  });

  it("принимает кириллическую «д»", () => {
    expect(parseDiceSpec("3д6")).toEqual({ count: 3, faces: 6 });
    expect(parseDiceSpec("д20")).toEqual({ count: 1, faces: 20 });
  });

  it("игнорирует обрамляющие пробелы", () => {
    expect(parseDiceSpec("  2d6 ")).toEqual({ count: 2, faces: 6 });
  });

  it("мусор и дроби → null", () => {
    expect(parseDiceSpec("")).toBeNull();
    expect(parseDiceSpec("abc")).toBeNull();
    expect(parseDiceSpec("d")).toBeNull();
    expect(parseDiceSpec("2d")).toBeNull();
    expect(parseDiceSpec("2.5d6")).toBeNull();
    expect(parseDiceSpec("2d6+1")).toBeNull();
  });

  it("нулевое/отрицательное число кубов или граней → null", () => {
    expect(parseDiceSpec("0")).toBeNull();
    expect(parseDiceSpec("0d6")).toBeNull();
    expect(parseDiceSpec("d0")).toBeNull();
    expect(parseDiceSpec("-3")).toBeNull(); // знак не входит в формат
  });

  it("слишком много кубов → null (защита размера ответа, не игровое правило)", () => {
    expect(parseDiceSpec(`${String(MAX_DICE)}d6`)).toEqual({ count: MAX_DICE, faces: 6 });
    expect(parseDiceSpec(`${String(MAX_DICE + 1)}d6`)).toBeNull();
  });
});

describe("attributeCheckOutcome", () => {
  // d20, характеристика 12: 1 — крит-успех, 2..12 — успех, 13..19 — провал, 20 — крит-провал
  test.each<[number, ReturnType<typeof attributeCheckOutcome>]>([
    [1, "crit_success"],
    [2, "success"],
    [12, "success"],
    [13, "failure"],
    [19, "failure"],
    [20, "crit_fail"],
  ])("d20, СИЛ 12, бросок %i → %s", (roll, expected) => {
    expect(attributeCheckOutcome(roll, 20, 12)).toBe(expected);
  });

  it("натуральная 1 — крит-успех даже когда характеристика мала", () => {
    expect(attributeCheckOutcome(1, 20, 0)).toBe("crit_success");
  });

  it("максимальная грань — всегда крит-провал, даже если характеристика ≥ числа граней", () => {
    // statValue 30 ≥ faces 6, но 6 (макс грань) — крит-провал, а не успех
    expect(attributeCheckOutcome(6, 6, 30)).toBe("crit_fail");
    expect(attributeCheckOutcome(5, 6, 30)).toBe("success");
  });

  it("низкая характеристика → почти всё провал", () => {
    expect(attributeCheckOutcome(2, 20, 1)).toBe("failure");
    expect(attributeCheckOutcome(1, 20, 1)).toBe("crit_success");
  });
});
