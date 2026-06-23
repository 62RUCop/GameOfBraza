import type { PrismaClient } from "@prisma/client";

const BASE_RACES = [
  { name: "Люди", description: "Универсальные бойцы, хорошо во всех ролях" },
  { name: "Орки", description: "Мощные воины, специализируются на танке и атаке" },
  { name: "Эльфы", description: "Ловкие и магически одарённые" },
  { name: "Звери", description: "Дикие существа, атакуют телом" },
  { name: "Наги", description: "Защитники с высокой броней" },
  { name: "Гномы", description: "Крепкие защитники с дальнобойным оружием" },
  { name: "Насекомые", description: "Непредсказуемые существа с рандомным HP" },
  { name: "Дриады", description: "Лесные духи, сильные хиллеры и колдуны" },
  { name: "Демоны", description: "Сильнейшие существа с многочисленными защитами" },
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
