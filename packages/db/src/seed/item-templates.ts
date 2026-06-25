import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Prisma, type PrismaClient, type SlotType, type StatAttribute } from "@prisma/client";
import { parseItemTemplates, type ParsedItemTemplate } from "./parse-csv.js";

// iconv-lite — CommonJS, тянем через require, чтобы не ловить ESM-interop.
const iconv = createRequire(import.meta.url)("iconv-lite") as typeof import("iconv-lite");

// Экспорт из Google Sheets отдаётся в Windows-1251 (кириллица), без BOM.
// Данные лежат вне src/ (packages/db/seed/data) — путь резолвим относительно
// модуля, а не cwd, чтобы работало и при `pnpm db:seed`, и в Docker-миграторе.
const CSV_PATH = fileURLToPath(new URL("../../seed/data/Gob_markets.csv", import.meta.url));

/** Прочитать и распарсить Gob_markets.csv в плоский список шаблонов предметов. */
export function loadItemTemplatesFromCsv(csvPath: string = CSV_PATH): ParsedItemTemplate[] {
  const buffer = readFileSync(csvPath);
  const csv = iconv.decode(buffer, "win1251");
  return parseItemTemplates(csv);
}

/**
 * Идемпотентный сид каталога предметов из Gob_markets.csv.
 * Натуральный ключ — `name` ("Категория Тир N"); upsert обновляет существующие.
 * Не каскадит на персонажей: меняются только справочные шаблоны.
 */
export async function seedItemTemplates(prisma: PrismaClient) {
  const items = loadItemTemplatesFromCsv();

  for (const item of items) {
    const data: Prisma.ItemTemplateCreateInput = {
      name: item.name,
      slotType: item.slotType as SlotType,
      weaponFamily: item.weaponFamily,
      isTwoHanded: item.isTwoHanded,
      tier: item.tier,
      requiredAttribute: item.requiredAttribute as StatAttribute | null,
      damageDice: item.damageDice,
      bonusCritDice: item.bonusCritDice,
      scalingAttribute: item.scalingAttribute as StatAttribute | null,
      scalingCoefficient: item.scalingCoefficient,
      statBonuses: item.statBonuses
        ? (item.statBonuses as Prisma.InputJsonValue)
        : Prisma.DbNull,
      hungerRestored: item.hungerRestored,
      referencePrice: item.referencePrice,
      description: item.description,
    };

    await prisma.itemTemplate.upsert({
      where: { name: item.name },
      create: data,
      update: data,
    });
  }

  console.log(`[seed] ItemTemplates: ${items.length} upserted from Gob_markets.csv`);
}

// CLI: точечный запуск (pnpm --filter @gob/db exec tsx src/seed/item-templates.ts).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  seedItemTemplates(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
