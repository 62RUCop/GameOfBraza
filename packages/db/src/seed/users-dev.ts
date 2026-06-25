import type { PrismaClient } from "@prisma/client";
import { createRequire } from "module";
const { hash } = createRequire(import.meta.url)("bcryptjs") as typeof import("bcryptjs");

/**
 * Dev-only seed: creates test accounts if they don't exist.
 * В production пропускается, КРОМЕ случая `force: true` (нужен для демо-данных,
 * которым требуется владелец-аккаунт `alexmgood@gmail.com`).
 */
export async function seedDevUsers(prisma: PrismaClient, opts: { force?: boolean } = {}) {
  if (process.env["NODE_ENV"] === "production" && !opts.force) return;

  const users = [
    { email: "admin@gob.local", role: "admin" as const, password: "admin123" },
    { email: "gm@gob.local",    role: "gm"    as const, password: "gm1234" },
    { email: "player@gob.local",role: "player" as const, password: "player1" },
	{ email: "alexmgood@gmail.com", role: "player" as const, password: "mikhalich322" },
  ];

  for (const u of users) {
    const existing = await prisma.account.findUnique({ where: { email: u.email } });
    if (existing) continue;
    const hashed = await hash(u.password, 10);
    await prisma.account.create({
      data: { email: u.email, role: u.role, password: hashed, name: u.role },
    });
    console.log(`[seed] Created dev user ${u.email} (${u.role})`);
  }
}
