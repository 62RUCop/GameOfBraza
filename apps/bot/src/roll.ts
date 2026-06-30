import { parseDiceSpec, type DiceSpec } from "@gob/rules";

/** Ключ характеристики (совпадает с ключами `StatBlock` ядра). */
export type AttrKey = "str" | "dex" | "int" | "spi" | "end" | "luc";

/** 3-буквенные обозначения проверок характеристик → ключ. */
const ATTR_DESIGNATIONS: Record<string, AttrKey> = {
  STR: "str",
  DEX: "dex",
  INT: "int",
  SPI: "spi",
  END: "end",
  LUC: "luc",
};

/**
 * Намерение броска, разобранное из аргументов `/roll`.
 * - `plain` — просто кубы (без семантики), `/roll 20` или `/roll 3d6`;
 * - `check` — проверка характеристики, `/roll STR 12`;
 * - `attack` — попадание, `/roll ATK 2d20`;
 * - `damage` — урон (сумма), `/roll DMG 3d6`;
 * - `bubble` — Бабл по d100, `/roll BBL`.
 */
export type RollIntent =
  | { kind: "plain"; dice: DiceSpec }
  | { kind: "check"; attribute: AttrKey; dice: DiceSpec }
  | { kind: "attack"; dice: DiceSpec }
  | { kind: "damage"; dice: DiceSpec }
  | { kind: "bubble" };

/**
 * Разбирает аргументы `/roll`. Структура: `<обозначение> <кубы>` либо просто `<кубы>`.
 * `<кубы>` — `NdM` / `dM` / `M` (для одного куба). Возвращает `null` при пустом/неверном вводе
 * (вызывающий показывает подсказку). Чистая функция — покрыта тестами.
 */
export function parseRollArgs(arg: string): RollIntent | null {
  const tokens = arg.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const first = (tokens[0] ?? "").toUpperCase();

  // BBL — всегда d100, спецификация кубов не нужна.
  if (first === "BBL") return { kind: "bubble" };

  const attribute = ATTR_DESIGNATIONS[first];
  if (attribute) {
    const dice = tokens[1] ? parseDiceSpec(tokens[1]) : null;
    return dice ? { kind: "check", attribute, dice } : null;
  }

  if (first === "ATK") {
    const dice = tokens[1] ? parseDiceSpec(tokens[1]) : null;
    return dice ? { kind: "attack", dice } : null;
  }

  if (first === "DMG") {
    const dice = tokens[1] ? parseDiceSpec(tokens[1]) : null;
    return dice ? { kind: "damage", dice } : null;
  }

  // Без обозначения — обычный бросок кубов.
  const dice = parseDiceSpec(tokens[0] ?? "");
  return dice ? { kind: "plain", dice } : null;
}

/** Один бросок куба `1..faces`. Единственное место RNG (математика в `@gob/rules` чистая). */
export function rollDie(faces: number): number {
  return Math.floor(Math.random() * faces) + 1;
}

/** `count` бросков куба `faces`. */
export function rollDice(count: number, faces: number): number[] {
  return Array.from({ length: count }, () => rollDie(faces));
}
