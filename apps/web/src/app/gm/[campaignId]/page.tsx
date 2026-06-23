import { prisma } from "@gob/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { computeDerived, DEFAULT_RULE_CONFIG } from "@gob/rules";
import { PartyControls } from "./party-controls";

export default async function CampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session) redirect("/sign-in");

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      ...(session.user.role !== "admin" ? { gmId: session.user.id } : {}),
      deletedAt: null,
    },
    include: {
      characters: {
        include: {
          character: {
            include: {
              attributes: true,
              runtimeState: true,
            },
          },
        },
      },
    },
  });

  if (!campaign) notFound();

  const party = campaign.characters.map((cc) => {
    const char = cc.character;
    const attrs = char.attributes;
    const rt = char.runtimeState;
    const derived = attrs
      ? computeDerived(
          { str: attrs.strength, dex: attrs.dexterity, int: attrs.intelligence, spi: attrs.spirit, end: attrs.endurance, luc: attrs.luck },
          { hp: 0 },
          DEFAULT_RULE_CONFIG,
        )
      : null;

    const hpMax = rt?.hpMaxManualOverride && rt.hpMaxOverride != null ? rt.hpMaxOverride : (derived?.hpMax ?? 0);
    const manaMax = rt?.manaMaxManualOverride && rt.manaMaxOverride != null ? rt.manaMaxOverride : (derived?.manaMax ?? 0);
    const apMax = rt?.apMaxManualOverride && rt.apMaxOverride != null ? rt.apMaxOverride : (derived?.apMax ?? 0);

    return {
      id: char.id,
      name: char.name,
      isNpc: char.isNpc,
      currentHp: rt?.currentHp ?? 0,
      hpMax,
      currentMana: rt?.currentMana ?? 0,
      manaMax,
      currentAp: rt?.currentAp ?? 0,
      apMax,
    };
  });

  const allCharacters = await prisma.character.findMany({
    where: { deletedAt: null, ownerId: session.user.id },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/gm" className="text-sm text-muted-foreground hover:text-foreground">← Кампании</Link>
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
      </div>

      {/* Party overview */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Обзор партии
        </h2>
        {party.length === 0 ? (
          <p className="text-sm text-muted-foreground">В кампании нет персонажей.</p>
        ) : (
          <div className="rounded-lg border overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Персонаж</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">HP</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Мана</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">ОД</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {party.map((member) => (
                  <tr key={member.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        {member.isNpc && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">NPC</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <BarCell current={member.currentHp} max={member.hpMax} color="bg-red-500" />
                    </td>
                    <td className="px-3 py-3">
                      <BarCell current={member.currentMana} max={member.manaMax} color="bg-blue-500" />
                    </td>
                    <td className="px-3 py-3">
                      <BarCell current={member.currentAp} max={member.apMax} color="bg-green-500" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/characters/${member.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / create controls */}
      <PartyControls
        campaignId={campaignId}
        allCharacters={allCharacters}
        partyIds={party.map((m) => m.id)}
      />
    </div>
  );
}

function BarCell({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  const overheal = current > max;
  return (
    <div className="min-w-[100px]">
      <div className="flex items-baseline gap-1 mb-1">
        <span className={overheal ? "font-bold text-amber-600" : "font-bold"}>{current}</span>
        <span className="text-xs text-muted-foreground">/ {max}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${overheal ? "bg-amber-400" : color}`}
          style={{ width: `${pct.toString()}%` }} />
      </div>
    </div>
  );
}
