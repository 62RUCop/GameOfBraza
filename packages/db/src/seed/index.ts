import { readFileSync, existsSync } from "fs";
import iconv from "iconv-lite";
import { join } from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { seedRuleConfig } from "./rule-config-defaults.js";
import { seedRaces } from "./races-defaults.js";
import { parseItemTemplates } from "./parse-csv.js";

const prisma = new PrismaClient();

async function seedItemsFromCsv() {
  const csvPath = join(import.meta.dirname, "../../seed/data/Gob_markets.csv");
  if (!existsSync(csvPath)) {
    console.log("[seed] Gob_markets.csv not found — skipping ItemTemplate seed");
    console.log(`       Place the file at: packages/db/seed/data/Gob_markets.csv`);
    return;
  }

  const rawBuffer = readFileSync(csvPath);
  const content = iconv.decode(rawBuffer, "win1251");
  const templates = parseItemTemplates(content);
  let count = 0;

  for (const t of templates) {
    await prisma.itemTemplate.upsert({
      where: { name: t.name },
      create: {
        name: t.name,
        slotType: t.slotType as never,
        weaponFamily: t.weaponFamily,
        isTwoHanded: t.isTwoHanded,
        tier: t.tier,
        requiredAttribute: t.requiredAttribute as never,
        damageDice: t.damageDice,
        bonusCritDice: t.bonusCritDice,
        scalingAttribute: t.scalingAttribute as never,
        scalingCoefficient: t.scalingCoefficient,
        statBonuses: t.statBonuses ?? Prisma.JsonNull,
        hungerRestored: t.hungerRestored,
        referencePrice: t.referencePrice,
        description: t.description,
      },
      update: {
        slotType: t.slotType as never,
        weaponFamily: t.weaponFamily,
        isTwoHanded: t.isTwoHanded,
        tier: t.tier,
        requiredAttribute: t.requiredAttribute as never,
        damageDice: t.damageDice,
        bonusCritDice: t.bonusCritDice,
        scalingAttribute: t.scalingAttribute as never,
        scalingCoefficient: t.scalingCoefficient,
        statBonuses: t.statBonuses ?? Prisma.JsonNull,
        hungerRestored: t.hungerRestored,
        referencePrice: t.referencePrice,
        description: t.description,
      },
    });
    count++;
  }

  console.log(`[seed] ItemTemplates: ${count} upserted from CSV`);
}

async function main() {
  console.log("[seed] Starting...");
  await seedRuleConfig(prisma);
  await seedRaces(prisma);
  await seedItemsFromCsv();
  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
