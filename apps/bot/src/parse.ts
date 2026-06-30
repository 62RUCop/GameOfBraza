/**
 * Дельта из аргумента команды (`/hp ±N`): «+5», «-3», «5», « 7 » → число; иначе `null`.
 * Только целые (значения хранилища целочисленные). Чистая функция — покрыта тестами.
 */
export function parseDelta(arg: string): number | null {
  const t = arg.trim();
  if (!/^[+-]?\d+$/.test(t)) return null;
  return Number(t) || 0; // нормализуем -0 → 0
}
