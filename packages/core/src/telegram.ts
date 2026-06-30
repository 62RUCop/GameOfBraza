import { randomBytes } from "node:crypto";
import { prisma } from "@gob/db";
import type { Actor } from "./actor";

/** Сколько живёт одноразовый код привязки (минуты). */
export const LINK_CODE_TTL_MINUTES = 15;

/**
 * Сгенерировать строку кода привязки: URL-safe (base64url), без паддинга.
 * 9 байт → ровно 12 символов из алфавита [A-Za-z0-9_-] — годится и для ручного
 * ввода `/start <код>`, и для deep-link `t.me/<bot>?start=<код>`.
 * Вынесено отдельно (чистая функция) ради тестируемости.
 */
export function createLinkCode(): string {
  return randomBytes(9).toString("base64url");
}

/** Истёк ли код (или его вовсе нет). Чистая функция — покрыта тестами. */
export function isLinkCodeExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= now.getTime();
}

/** Статус привязки для экрана настроек. */
export interface TelegramLinkStatus {
  linked: boolean;
  telegramChatId: string | null;
}

/**
 * Сгенерировать (или перевыпустить) одноразовый код привязки для аккаунта.
 * Idempotent по `accountId`: повторный вызов перезаписывает код и срок.
 * Уже привязанный `telegramChatId` не трогаем — он сбросится при следующем `/start`.
 */
export async function generateLinkCode(
  accountId: string,
): Promise<{ code: string; expiresAt: Date }> {
  const code = createLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60_000);
  await prisma.telegramLink.upsert({
    where: { accountId },
    create: { accountId, linkCode: code, linkCodeExpiresAt: expiresAt },
    update: { linkCode: code, linkCodeExpiresAt: expiresAt, deletedAt: null },
  });
  return { code, expiresAt };
}

/** Статус привязки аккаунта (для `/settings`). */
export async function getLinkStatus(accountId: string): Promise<TelegramLinkStatus> {
  const link = await prisma.telegramLink.findFirst({
    where: { accountId, deletedAt: null },
    select: { telegramChatId: true },
  });
  return { linked: link?.telegramChatId != null, telegramChatId: link?.telegramChatId ?? null };
}

/** Отвязать Telegram от аккаунта (чистим chat/код, строку оставляем для повторной привязки). */
export async function unlinkTelegram(accountId: string): Promise<{ ok: true }> {
  await prisma.telegramLink.updateMany({
    where: { accountId, deletedAt: null },
    data: { telegramChatId: null, linkedAt: null, linkCode: null, linkCodeExpiresAt: null },
  });
  return { ok: true };
}

/** Кого бот «увидел» по коду — для приветствия после успешной привязки. */
export interface LinkedAccount {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Погасить код привязки от имени Telegram-чата.
 * Поток: игрок прислал боту `/start <код>` → находим запись по коду (не истёкшему),
 * проставляем `telegramChatId`/`linkedAt`, гасим код. Один чат ↔ один аккаунт:
 * если этот чат уже привязан к другому аккаунту — освобождаем старую запись (в транзакции),
 * чтобы не нарушить `@unique` на `telegramChatId`.
 */
export async function consumeLinkCode(
  code: string,
  chatId: string,
): Promise<{ ok: true; account: LinkedAccount } | { error: string }> {
  const link = await prisma.telegramLink.findFirst({
    where: { linkCode: code, deletedAt: null },
    include: { account: { select: { id: true, name: true, email: true } } },
  });
  if (!link) return { error: "Код не найден или уже использован." };
  if (isLinkCodeExpired(link.linkCodeExpiresAt)) {
    return { error: "Срок действия кода истёк. Сгенерируйте новый в настройках на сайте." };
  }

  await prisma.$transaction(async (tx) => {
    // Освобождаем chatId от любой другой записи (на случай повторной привязки нового аккаунта).
    await tx.telegramLink.updateMany({
      where: { telegramChatId: chatId, NOT: { id: link.id } },
      data: { telegramChatId: null, linkedAt: null },
    });
    await tx.telegramLink.update({
      where: { id: link.id },
      data: { telegramChatId: chatId, linkedAt: new Date(), linkCode: null, linkCodeExpiresAt: null },
    });
  });

  return { ok: true, account: link.account };
}

/**
 * Разрешить актора по Telegram chat_id (привязанная запись → аккаунт).
 * Слой ядра нарочно не знает про Telegram дальше этой точки: дальше работает обычный `Actor`,
 * а проверки видимости/владения те же, что и для веба (§ золотое правило 6).
 */
export async function resolveActorByChatId(chatId: string): Promise<Actor | null> {
  const link = await prisma.telegramLink.findFirst({
    where: { telegramChatId: chatId, linkedAt: { not: null }, deletedAt: null },
    include: { account: { select: { id: true, role: true } } },
  });
  if (!link) return null;
  return { id: link.account.id, role: link.account.role };
}
