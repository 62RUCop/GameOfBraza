import type { PrismaClient } from "@prisma/client";

const BASE_RACES = [
  { name: "Человек", description: "Обычный человек этого мира" },
  { name: "Полукровка", description: "Смешанное происхождение" },
  { name: "Нежить", description: "Вернувшийся из мёртвых" },
];

export async function seedRaces(prisma: PrismaClient) {
  for (const race of BASE_RACES) {
    await prisma.race.upsert({
      where: { name: race.name },
      create: race,
      update: { description: race.description },
    });
  }
  console.log(`[seed] Races: ${BASE_RACES.length} upserted`);
}
