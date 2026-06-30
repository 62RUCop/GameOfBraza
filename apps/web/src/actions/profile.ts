"use server";

import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@gob/db";
import {
  generateLinkCode,
  getLinkStatus,
  unlinkTelegram,
  LINK_CODE_TTL_MINUTES,
  type TelegramLinkStatus,
} from "@gob/core";
import { auth } from "@/lib/auth";

const updateNameSchema = z.object({
  name: z.string().min(1, "Имя не может быть пустым").max(64),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Минимум 6 символов"),
});

export async function updateName(input: { name: string }) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const parsed = updateNameSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };

  await prisma.account.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  return { ok: true };
}

export async function updatePassword(input: { currentPassword: string; newPassword: string }) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };

  const account = await prisma.account.findUnique({ where: { id: session.user.id } });
  if (!account?.password) return { error: "Смена пароля недоступна для этого аккаунта" };

  const valid = await compare(parsed.data.currentPassword, account.password);
  if (!valid) return { error: "Неверный текущий пароль" };

  const hashed = await hash(parsed.data.newPassword, 12);
  await prisma.account.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { ok: true };
}

// ── Telegram-привязка (тонкие обёртки над @gob/core) ───────────────────────────

export async function getTelegramLinkStatus(): Promise<TelegramLinkStatus | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };
  return getLinkStatus(session.user.id);
}

export async function createTelegramLinkCode(): Promise<
  { code: string; expiresAt: string; ttlMinutes: number } | { error: string }
> {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };
  const { code, expiresAt } = await generateLinkCode(session.user.id);
  return { code, expiresAt: expiresAt.toISOString(), ttlMinutes: LINK_CODE_TTL_MINUTES };
}

export async function removeTelegramLink(): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };
  return unlinkTelegram(session.user.id);
}
