import { PrismaClient } from "@prisma/client";
import { seedRuleConfig } from "./rule-config-defaults.js";
import { seedRaces } from "./races-defaults.js";
import { seedGroups } from "./groups-defaults.js";
import { seedNpcArchetypes } from "./npc-archetypes-defaults.js";
import { seedDevUsers } from "./users-dev.js";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] Starting...");
  await seedRuleConfig(prisma);
  await seedRaces(prisma);
  await seedGroups(prisma);
  await seedNpcArchetypes(prisma);
  await seedDevUsers(prisma);
  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
