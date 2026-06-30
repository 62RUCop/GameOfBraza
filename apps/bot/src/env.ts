import { config as loadEnv } from "dotenv";
import { z } from "zod";

// Локальный запуск: подхватываем apps/bot/.env (в Docker переменные приходят из окружения,
// файла нет — dotenv просто молча ничего не делает).
loadEnv();

const EnvSchema = z.object({
  // Токен от @BotFather. Берётся только из окружения — в репозитории его нет (§ секреты).
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN не задан — скопируй из .env.example и заполни"),
  // Та же БД, что у веба (путь A): бот ходит к ней напрямую через @gob/db.
  DATABASE_URL: z.string().min(1, "DATABASE_URL не задан — бот ходит к той же БД, что и веб"),
  // long-polling не открывает свой HTTP-порт, поэтому healthcheck слушает отдельный порт.
  BOT_HEALTHCHECK_PORT: z.coerce.number().int().positive().default(3001),
});

export type BotEnv = z.infer<typeof EnvSchema>;

function parseEnv(): BotEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Некорректное окружение бота:\n${details}`);
  }
  return parsed.data;
}

export const env = parseEnv();
