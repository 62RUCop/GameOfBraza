import type { Role } from "@gob/db";

/**
 * Кто выполняет действие. Веб получает актора из NextAuth-сессии,
 * Telegram-бот — из привязки `TelegramLink` (chatId → Account).
 * Слой ядра нарочно не знает про способ аутентификации: ему передают уже
 * разрешённого актора, а проверки видимости/владения одинаковы для всех клиентов.
 */
export interface Actor {
  id: string;
  role: Role;
}

/** Единый формат результата мутаций ядра (как в server actions: либо `ok`, либо `error`). */
export type Result = { ok: true } | { error: string };

/**
 * Право на правку персонажа: владелец (по `ownerId`) либо `gm`/`admin`.
 * § золотое правило 6 — роли это область видимости, а не набор прав на отдельные поля,
 * поэтому проверка единая для всего листа (не дублируем её в каждой мутации).
 */
export function canEditCharacter(actor: Actor, character: { ownerId: string }): boolean {
  if (actor.role === "gm" || actor.role === "admin") return true;
  return character.ownerId === actor.id;
}
