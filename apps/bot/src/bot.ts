import { Bot } from "grammy";
import { env } from "./env";

/**
 * Фабрика grammY-бота. Пока это скелет (TODO п.9): только проверочные хэндлеры.
 * На следующих шагах сюда добавятся привязка аккаунта (`/start <код>` → `TelegramLink`)
 * и игровые команды (`/me`, `/hp`, `/ap`, `/mana`, `/roll`, `/bag`, `/money`),
 * которые вызывают слой `@gob/core` — вся игровая математика остаётся в `@gob/rules`.
 */
export function createBot(): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Привет! Это бот Game of Braza.\n" +
        "Привязка аккаунта и игровые команды появятся в следующих обновлениях.",
    );
  });

  // Простейшая проверка живости со стороны Telegram (healthcheck сервера — отдельно, в health.ts).
  bot.command("ping", async (ctx) => {
    await ctx.reply("pong");
  });

  // Глобальный обработчик ошибок: упавший апдейт не должен ронять long-polling.
  bot.catch((err) => {
    console.error(`[bot] ошибка при обработке апдейта ${String(err.ctx.update.update_id)}:`, err.error);
  });

  return bot;
}
