import { describe, it, expect } from "vitest";
import { canEditCharacter, type Actor } from "../actor";

const OWNER_ID = "acc_owner";
const character = { ownerId: OWNER_ID };

describe("canEditCharacter", () => {
  it("владелец-игрок может править свой лист", () => {
    const actor: Actor = { id: OWNER_ID, role: "player" };
    expect(canEditCharacter(actor, character)).toBe(true);
  });

  it("игрок не может править чужой лист", () => {
    const actor: Actor = { id: "acc_other", role: "player" };
    expect(canEditCharacter(actor, character)).toBe(false);
  });

  it("gm может править любой лист (§ золотое правило 6)", () => {
    const actor: Actor = { id: "acc_gm", role: "gm" };
    expect(canEditCharacter(actor, character)).toBe(true);
  });

  it("admin может править любой лист", () => {
    const actor: Actor = { id: "acc_admin", role: "admin" };
    expect(canEditCharacter(actor, character)).toBe(true);
  });
});
