/**
 * Кубы: парсинг нотации «NdM» и исход проверки характеристики.
 * Чистые функции (без RNG) — генерация значений живёт у вызывающего (бот),
 * сюда передаются уже выпавшие значения, как в `combat.ts`/`bubble.ts`.
 */

/** Разобранная спецификация броска: `count` кубов по `faces` граней. */
export interface DiceSpec {
  count: number;
  faces: number;
}

/** Разумный потолок числа кубов за один бросок (защита от спама, не игровое правило). */
export const MAX_DICE = 100;

const DICE_RE = /^(\d*)[dDдД](\d+)$/;

/**
 * Парсит спецификацию броска: «NdM» / «dM» / «M» (для одного куба) → {count, faces}, иначе `null`.
 * Принимает и латинскую `d`, и кириллическую `д`. Это проверка формата ввода, а не игровое
 * правило — границы (`count ≥ 1`, `faces ≥ 1`, `count ≤ MAX_DICE`) защищают размер ответа.
 */
export function parseDiceSpec(input: string): DiceSpec | null {
  const t = input.trim();
  if (t === "") return null;

  const m = DICE_RE.exec(t);
  if (m) {
    const count = m[1] === "" ? 1 : Number(m[1]);
    const faces = Number(m[2]);
    if (!Number.isInteger(count) || !Number.isInteger(faces)) return null;
    if (count < 1 || faces < 1 || count > MAX_DICE) return null;
    return { count, faces };
  }

  if (/^\d+$/.test(t)) {
    const faces = Number(t);
    if (faces < 1) return null;
    return { count: 1, faces };
  }

  return null;
}

/** Исход проверки характеристики (§ ТЗ 3 + уточнение заказчика по `/roll`). */
export type CheckOutcome = "crit_success" | "success" | "failure" | "crit_fail";

/**
 * Проверка характеристики по одному кубу: меньше — лучше.
 * - `1` → критический успех;
 * - максимальная грань → критический провал (и что-то плохое сверх неудачи);
 * - `2..statValue` → обычный успех;
 * - иначе → обычный провал.
 *
 * Приоритет крайних случаев: натуральная `1` важнее проверки `≤ statValue`, а максимальная
 * грань всегда провал, даже если `statValue ≥ faces` (потолок куба не «зажимаем» — § правило 1).
 */
export function attributeCheckOutcome(roll: number, faces: number, statValue: number): CheckOutcome {
  if (roll === 1) return "crit_success";
  if (roll === faces) return "crit_fail";
  if (roll <= statValue) return "success";
  return "failure";
}
