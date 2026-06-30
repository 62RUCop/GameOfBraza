import { describe, it, expect } from "vitest";
import { createLinkCode, isLinkCodeExpired } from "../telegram";

describe("createLinkCode", () => {
  it("возвращает непустой URL-safe код", () => {
    const code = createLinkCode();
    // base64url-алфавит: A-Z a-z 0-9 _ -, без паддинга
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeGreaterThan(0);
  });

  it("9 байт → 12 символов (без паддинга)", () => {
    expect(createLinkCode()).toHaveLength(12);
  });

  it("выдаёт разные коды (случайность)", () => {
    expect(createLinkCode()).not.toBe(createLinkCode());
  });
});

describe("isLinkCodeExpired", () => {
  const now = new Date("2026-06-27T12:00:00Z");

  it("null/undefined считается истёкшим", () => {
    expect(isLinkCodeExpired(null, now)).toBe(true);
    expect(isLinkCodeExpired(undefined, now)).toBe(true);
  });

  it("срок в будущем — не истёк", () => {
    expect(isLinkCodeExpired(new Date("2026-06-27T12:05:00Z"), now)).toBe(false);
  });

  it("срок в прошлом — истёк", () => {
    expect(isLinkCodeExpired(new Date("2026-06-27T11:59:59Z"), now)).toBe(true);
  });

  it("ровно сейчас — истёк (граница включительно)", () => {
    expect(isLinkCodeExpired(new Date("2026-06-27T12:00:00Z"), now)).toBe(true);
  });
});
