import { Bot, InlineKeyboard, type Context } from "grammy";
import {
  adjustRuntimeResource,
  applyActorBubbleRoll,
  consumeLinkCode,
  getActorCharacterSummary,
  getActorInventory,
  getActorMoney,
  getActorRollContext,
  resolveActorByChatId,
  type Actor,
  type RuntimeResource,
} from "@gob/core";
import { env } from "./env";
import {
  formatAttackRoll,
  formatBubbleRoll,
  formatCheckRoll,
  formatDamageRoll,
  formatInventory,
  formatMoney,
  formatPlainRoll,
  formatResourceState,
  formatSummary,
} from "./format";
import { parseDelta } from "./parse";
import { parseRollArgs, rollDice, rollDie } from "./roll";

/** Подсказка по `/roll` при пустом/неверном вводе. */
const ROLL_USAGE = [
  "🎲 /roll — броски кубов",
  "",
  "• /roll 20 — случайное 1..20",
  "• /roll 3d6 — три d6 (сумма, мин/макс)",
  "• /roll STR 12 — проверка характеристики на d12 (STR DEX INT SPI END LUC)",
  "• /roll ATK 2d20 — попадание (2 куба = преимущество, берётся бо́льший)",
  "• /roll DMG 3d6 — урон (сумма + доп. от характеристики оружия)",
  "• /roll BBL — проверка Бабла (d100)",
].join("\n");

/** id Telegram-чата как строка (в БД `telegramChatId` — строка). */
function chatIdOf(ctx: Context): string | null {
  return ctx.chat ? String(ctx.chat.id) : null;
}

const NOT_LINKED =
  "Аккаунт не привязан. Сгенерируй код в настройках на сайте и пришли его командой /start <код>.";

/** Резолвит актора по чату; сам отвечает игроку, если привязки нет. */
async function requireActor(ctx: Context): Promise<Actor | null> {
  const chatId = chatIdOf(ctx);
  if (!chatId) {
    await ctx.reply("Не удалось определить чат.");
    return null;
  }
  const actor = await resolveActorByChatId(chatId);
  if (!actor) {
    await ctx.reply(NOT_LINKED);
    return null;
  }
  return actor;
}

/** Кнопки быстрых правок ресурса. `callback_data`: `adj:<resource>:<delta>`. */
function resourceKeyboard(resource: RuntimeResource): InlineKeyboard {
  return new InlineKeyboard()
    .text("-5", `adj:${resource}:-5`)
    .text("-1", `adj:${resource}:-1`)
    .text("+1", `adj:${resource}:1`)
    .text("+5", `adj:${resource}:5`);
}

/**
 * Фабрика grammY-бота. Бот — ещё один потребитель ядра `@gob/core`:
 * привязка аккаунта (`/start <код>` → `TelegramLink`), чтение листа (`/me`) и правка живых
 * значений (`/hp`/`/mana`/`/ap`). Вся математика — в `@gob/rules`, права — по `ownerId`,
 * никакого clamp (§ золотые правила 1, 2, 6).
 */
export function createBot(): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  // /start [код]: без кода — приветствие, с кодом — привязка аккаунта.
  bot.command("start", async (ctx) => {
    const chatId = chatIdOf(ctx);
    const code = ctx.match.trim();
    if (!chatId) {
      await ctx.reply("Не удалось определить чат.");
      return;
    }
    if (!code) {
      await ctx.reply(
        "Привет! Это бот Game of Braza.\n\n" +
          "Чтобы привязать аккаунт: открой настройки на сайте, сгенерируй код привязки " +
          "и пришли его сюда командой /start <код>.",
      );
      return;
    }
    const res = await consumeLinkCode(code, chatId);
    if ("error" in res) {
      await ctx.reply(res.error);
      return;
    }
    const who = res.account.name ?? res.account.email;
    await ctx.reply(`Готово! Аккаунт «${who}» привязан. Команда /me покажет твой лист.`);
  });

  // /me: сводка листа привязанного игрока.
  bot.command("me", async (ctx) => {
    const actor = await requireActor(ctx);
    if (!actor) return;
    const summary = await getActorCharacterSummary(actor);
    if (!summary) {
      await ctx.reply("У тебя пока нет персонажа на сайте.");
      return;
    }
    await ctx.reply(formatSummary(summary));
  });

  // /money: баланс активного листа (золото/серебро/бронза через @gob/rules).
  bot.command("money", async (ctx) => {
    const actor = await requireActor(ctx);
    if (!actor) return;
    const money = await getActorMoney(actor);
    if (!money) {
      await ctx.reply("У тебя пока нет персонажа на сайте.");
      return;
    }
    await ctx.reply(formatMoney(money));
  });

  // /bag: инвентарь активного листа (надетое снаряжение + рюкзак).
  bot.command("bag", async (ctx) => {
    const actor = await requireActor(ctx);
    if (!actor) return;
    const inventory = await getActorInventory(actor);
    if (!inventory) {
      await ctx.reply("У тебя пока нет персонажа на сайте.");
      return;
    }
    await ctx.reply(formatInventory(inventory));
  });

  // /roll: броски кубов. Обычный бросок (`plain`) — без привязки; проверки/атака/урон/бабл —
  // по активному листу актора. RNG здесь (`rollDice`/`rollDie`), вся математика — в `@gob/rules`.
  bot.command("roll", async (ctx) => {
    const intent = parseRollArgs(ctx.match.trim());
    if (!intent) {
      await ctx.reply(ROLL_USAGE);
      return;
    }

    // Чистые кубы — аккаунт не нужен.
    if (intent.kind === "plain") {
      const rolls = rollDice(intent.dice.count, intent.dice.faces);
      await ctx.reply(formatPlainRoll(intent.dice.faces, rolls));
      return;
    }

    const actor = await requireActor(ctx);
    if (!actor) return;

    // Бабл: бросаем d100 и пишем состояние (заряды/active) через ядро.
    if (intent.kind === "bubble") {
      const res = await applyActorBubbleRoll(actor, rollDie(100));
      await ctx.reply("error" in res ? res.error : formatBubbleRoll(res));
      return;
    }

    const context = await getActorRollContext(actor);
    if (!context) {
      await ctx.reply("У тебя пока нет персонажа на сайте.");
      return;
    }

    const { count, faces } = intent.dice;
    const rolls = rollDice(count, faces);
    if (intent.kind === "check") {
      await ctx.reply(formatCheckRoll(intent.attribute, context.attributes[intent.attribute], faces, rolls));
    } else if (intent.kind === "attack") {
      await ctx.reply(formatAttackRoll(context.attributes.dex, context.critBonus, faces, rolls));
    } else {
      await ctx.reply(formatDamageRoll(faces, rolls, context.weapons));
    }
  });

  // /hp /mana /ap: изменить текущее значение на дельту (без clamp) либо показать текущее.
  const registerResource = (resource: RuntimeResource): void => {
    bot.command(resource, async (ctx) => {
      const actor = await requireActor(ctx);
      if (!actor) return;

      const arg = ctx.match.trim();
      if (arg === "") {
        const summary = await getActorCharacterSummary(actor);
        if (!summary) {
          await ctx.reply("У тебя пока нет персонажа на сайте.");
          return;
        }
        const pair = summary[resource];
        await ctx.reply(formatResourceState(resource, pair.current, pair.max), {
          reply_markup: resourceKeyboard(resource),
        });
        return;
      }

      const delta = parseDelta(arg);
      if (delta === null) {
        await ctx.reply(`Формат: /${resource} ±N, например /${resource} -5`);
        return;
      }
      const res = await adjustRuntimeResource(actor, resource, delta);
      if ("error" in res) {
        await ctx.reply(res.error);
        return;
      }
      await ctx.reply(formatResourceState(resource, res.current, res.max), {
        reply_markup: resourceKeyboard(resource),
      });
    });
  };
  registerResource("hp");
  registerResource("mana");
  registerResource("ap");

  // Инлайн-кнопки быстрых правок (тот же путь, что у текстовых команд).
  bot.callbackQuery(/^adj:(?:hp|mana|ap):-?\d+$/, async (ctx) => {
    const [, resourceRaw, deltaRaw] = ctx.callbackQuery.data.split(":");
    if (!resourceRaw || deltaRaw === undefined) {
      await ctx.answerCallbackQuery();
      return;
    }
    const resource = resourceRaw as RuntimeResource;
    const delta = Number(deltaRaw);

    const chatId = chatIdOf(ctx);
    const actor = chatId ? await resolveActorByChatId(chatId) : null;
    if (!actor) {
      await ctx.answerCallbackQuery({ text: "Аккаунт не привязан." });
      return;
    }
    const res = await adjustRuntimeResource(actor, resource, delta);
    if ("error" in res) {
      await ctx.answerCallbackQuery({ text: res.error });
      return;
    }
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText(formatResourceState(resource, res.current, res.max), {
        reply_markup: resourceKeyboard(resource),
      });
    } catch {
      // «message is not modified» и подобные ошибки редактирования — некритичны.
    }
  });

  // Проверка живости со стороны Telegram (HTTP-healthcheck — отдельно, в health.ts).
  bot.command("ping", async (ctx) => {
    await ctx.reply("pong");
  });

  // Глобальный обработчик ошибок: упавший апдейт (в т.ч. недоступная БД) не должен ронять polling.
  bot.catch((err) => {
    console.error(`[bot] ошибка при обработке апдейта ${String(err.ctx.update.update_id)}:`, err.error);
  });

  return bot;
}
