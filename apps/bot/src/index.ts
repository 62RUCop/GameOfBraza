import { createBot } from "./bot";
import { env } from "./env";
import { startHealthServer } from "./health";

async function main(): Promise<void> {
  const health = startHealthServer(env.BOT_HEALTHCHECK_PORT);
  const bot = createBot();

  // Меню команд (автодополнение в Telegram). Не критично — сбой не мешает работе бота.
  await bot.api
    .setMyCommands([
      { command: "me", description: "Сводка листа" },
      { command: "hp", description: "Изменить HP: /hp ±N" },
      { command: "mana", description: "Изменить ману: /mana ±N" },
      { command: "ap", description: "Изменить ОД: /ap ±N" },
      { command: "bag", description: "Инвентарь: снаряжение и рюкзак" },
      { command: "money", description: "Баланс: золото/серебро/бронза" },
      { command: "roll", description: "Бросок кубов: /roll ATK 2d20, STR 12, DMG 3d6, BBL" },
      { command: "start", description: "Привязать аккаунт: /start <код>" },
    ])
    .catch((e: unknown) => {
      console.error("[bot] не удалось задать меню команд:", e);
    });

  // Корректное завершение: гасим polling и HTTP-сервер по сигналу (важно для Docker/tsx watch).
  const stop = async (signal: string): Promise<void> => {
    console.log(`[bot] получен ${signal}, останавливаюсь…`);
    await bot.stop();
    health.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));

  console.log("[bot] запускаю long-polling…");
  // bot.start() резолвится только при остановке бота, поэтому await — в самом конце.
  await bot.start({
    onStart: (info) => {
      console.log(`[bot] @${info.username} на связи`);
    },
  });
}

main().catch((err: unknown) => {
  console.error("[bot] фатальная ошибка запуска:", err);
  process.exit(1);
});
