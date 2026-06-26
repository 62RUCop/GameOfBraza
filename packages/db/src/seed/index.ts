import { PrismaClient } from "@prisma/client";
import { seedRuleConfig } from "./rule-config-defaults.js";
import { seedRaces } from "./races-defaults.js";
import { seedGroups } from "./groups-defaults.js";
import { seedNpcArchetypes } from "./npc-archetypes-defaults.js";
import { seedInitialAdmin } from "./initial-admin.js";
import { seedDevUsers } from "./users-dev.js";
import { seedItemTemplates } from "./item-templates-defaults.js";
import { seedDemoCharacter } from "./character-demo.js";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] Starting...");
  // Справочники — идемпотентны (upsert), безопасно прогонять на каждый деплой.
  await seedRuleConfig(prisma);
  await seedRaces(prisma);
  await seedGroups(prisma);
  await seedNpcArchetypes(prisma);
  // Первичный admin из ENV (работает и в production) — сидим до каталога.
  await seedInitialAdmin(prisma);
  // Dev-пользователи — только вне production.
  await seedDevUsers(prisma);
  // Каталог предметов — статический TS-справочник (item-templates-defaults.ts), upsert идемпотентен.
  await seedItemTemplates(prisma);

  // Демо-данные (SEED_DEMO=true): дев-пользователи + готовый тестовый персонаж
  // для быстрой проверки UI. Идемпотентно (guard по имени + ownerId).
  if (process.env["SEED_DEMO"] === "true") {
    console.log("[seed] SEED_DEMO=true → демо-данные (dev-пользователи + демо-персонаж)");
    await seedDevUsers(prisma, { force: true });
    await seedDemoCharacter(prisma);
  }

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
