import { describe, it, expect } from "vitest";
import { parseDelta } from "../parse";

describe("parseDelta", () => {
  it("разбирает знак и число", () => {
    expect(parseDelta("+5")).toBe(5);
    expect(parseDelta("-3")).toBe(-3);
    expect(parseDelta("5")).toBe(5);
  });

  it("игнорирует обрамляющие пробелы", () => {
    expect(parseDelta("  7 ")).toBe(7);
  });

  it("0 и -0 → 0", () => {
    expect(parseDelta("0")).toBe(0);
    expect(parseDelta("-0")).toBe(0);
  });

  it("мусор и дроби → null", () => {
    expect(parseDelta("")).toBeNull();
    expect(parseDelta("abc")).toBeNull();
    expect(parseDelta("5.5")).toBeNull();
    expect(parseDelta("+")).toBeNull();
    expect(parseDelta("5 6")).toBeNull();
  });
});
