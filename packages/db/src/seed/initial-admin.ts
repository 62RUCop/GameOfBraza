import type { PrismaClient } from "@prisma/client";
import { createRequire } from "module";
const { hash } = createRequire(import.meta.url)("bcryptjs") as typeof import("bcryptjs");

/**
 * Идемпотентно создаёт первичный admin-аккаунт из ENV (ADMIN_EMAIL/ADMIN_PASSWORD).
 * Безопасно для production: без этого на чистом сервере было бы некому войти.
 *
 * - Пароль НЕ перезаписывается, если аккаунт уже существует (админ мог сменить
 *   его в интерфейсе) — обновляем только роль до admin.
 * - Если ENV не задан — тихо пропускаем (в dev вход обеспечивают dev-пользователи).
 */
export async function seedInitialAdmin(prisma: PrismaClient) {
  const email = process.env["ADMIN_EMAIL"]?.trim();
  const password = process.env["ADMIN_PASSWORD"]?.trim();

  if (!email || !password) {
    console.log("[seed] initial admin: ADMIN_EMAIL/ADMIN_PASSWORD не заданы — пропуск");
    return;
  }

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "admin") {
      await prisma.account.update({ where: { email }, data: { role: "admin" } });
      console.log(`[seed] initial admin: роль ${email} повышена до admin`);
    } else {
      console.log(`[seed] initial admin: ${email} уже существует — пропуск`);
    }
    return;
  }

  const hashed = await hash(password, 10);
  await prisma.account.create({
    data: { email, role: "admin", password: hashed, name: "Admin" },
  });
  console.log(`[seed] initial admin: создан ${email}`);
}
