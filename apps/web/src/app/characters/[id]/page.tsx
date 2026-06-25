import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@gob/db";
import { CharacterSheet } from "@/components/character-sheet/character-sheet";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CharacterPage({ params, searchParams }: Props) {
  const [{ id }, { tab }, session] = await Promise.all([params, searchParams, auth()]);
  if (!session) return null;

  const character = await prisma.character.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(session.user.role === "player" ? { ownerId: session.user.id } : {}),
    },
    include: {
      race: true,
      group: true,
      attributes: true,
      runtimeState: true,
      currency: true,
      pet: { include: { ability: true } },
      innateAbility: true,
      equipmentSlots: { include: { template: true } },
      characterSkills: {
        include: {
          skill: true,
          character: { select: { characterSkillTags: { include: { category: true } } } },
        },
      },
      backpackSlots: { orderBy: { slotIndex: "asc" } },
      reputations: { include: { race: true } },
    },
  });

  if (!character) notFound();

  // Ensure every race has a reputation row (virtual value 0 for missing ones)
  const allRaces = await prisma.race.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const repByRaceId = new Map(character.reputations.map((r) => [r.raceId, r]));
  const reputations = allRaces.map(
    (race) =>
      repByRaceId.get(race.id) ?? {
        id: "",
        characterId: character.id,
        raceId: race.id,
        value: 0,
        race,
      },
  );

  const serialized = {
    ...character,
    reputations,
    group: character.group
      ? { ...character.group, modifierValue: character.group.modifierValue != null ? Number(character.group.modifierValue) : null }
      : null,
    currency: character.currency
      ? { ...character.currency, balanceBronze: Number(character.currency.balanceBronze) }
      : null,
    equipmentSlots: character.equipmentSlots.map((inst) => ({
      ...inst,
      acquiredPrice: inst.acquiredPrice != null ? Number(inst.acquiredPrice) : null,
      template: inst.template
        ? {
            ...inst.template,
            referencePrice: Number(inst.template.referencePrice),
            scalingCoefficient:
              inst.template.scalingCoefficient != null
                ? Number(inst.template.scalingCoefficient)
                : null,
          }
        : null,
    })),
  };

  return (
    <CharacterSheet
      character={serialized}
      activeTab={tab ?? "description"}
      viewerRole={session.user.role}
      viewerId={session.user.id}
    />
  );
}
