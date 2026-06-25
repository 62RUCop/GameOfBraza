import { PrismaClient } from "@prisma/client";
import { seedRuleConfig } from "./rule-config-defaults.js";
import { seedRaces } from "./races-defaults.js";
import { seedGroups } from "./groups-defaults.js";
import { seedNpcArchetypes } from "./npc-archetypes-defaults.js";
import { seedInitialAdmin } from "./initial-admin.js";
import { seedDevUsers } from "./users-dev.js";
import { seedItemTemplates } from "./item-templates.js";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] Starting...");
  // Справочники — идемпотентны (upsert), безопасно прогонять на каждый деплой.
  await seedRuleConfig(prisma);
  await seedRaces(prisma);
  await seedGroups(prisma);
  await seedNpcArchetypes(prisma);
  // Каталог предметов из Gob_markets.csv — справочник, upsert идемпотентен.
  await seedItemTemplates(prisma);
  // Первичный admin из ENV (работает и в production).
  await seedInitialAdmin(prisma);
  // Dev-пользователи — только вне production.
  await seedDevUsers(prisma);

  // Демо-данные (SEED_DEMO=true). Демо-персонаж временно убран (старый «Михалыч»
  // удалён как недостаточный); пока флаг лишь досевает dev-пользователей,
  // чтобы у будущего тестового персонажа был владелец-аккаунт.
  if (process.env["SEED_DEMO"] === "true") {
    console.log("[seed] SEED_DEMO=true → демо-данные (dev-пользователи)");
    await seedDevUsers(prisma, { force: true });
  }

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
