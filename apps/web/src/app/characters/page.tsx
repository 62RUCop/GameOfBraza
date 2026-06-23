import { auth } from "@/lib/auth";
import { prisma } from "@gob/db";
import Link from "next/link";
import { cn } from "@gob/ui";

export default async function CharactersPage() {
  const session = await auth();
  if (!session) return null;

  const { id: userId, role } = session.user;

  const characters = await prisma.character.findMany({
    where: role === "admin"
      ? { deletedAt: null }
      : role === "gm"
        ? { deletedAt: null }
        : { ownerId: userId, deletedAt: null },
    include: {
      race: { select: { name: true } },
      attributes: { select: { strength: true, dexterity: true, intelligence: true, spirit: true, endurance: true, luck: true } },
    },
    orderBy: [{ isNpc: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Персонажи</h1>
        <Link
          href="/characters/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Создать персонажа
        </Link>
      </div>

      {characters.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          У вас пока нет персонажей
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => (
            <Link
              key={char.id}
              href={`/characters/${char.id}`}
              className={cn(
                "group rounded-lg border bg-card p-5 transition-colors",
                "hover:border-primary/50 hover:bg-accent/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{char.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {char.race?.name ?? "Раса не указана"}
                    {char.isNpc && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">NPC</span>
                    )}
                  </p>
                </div>
              </div>

              {char.attributes && (
                <div className="mt-3 grid grid-cols-6 gap-1 text-center">
                  {(
                    [
                      ["STR", char.attributes.strength],
                      ["DEX", char.attributes.dexterity],
                      ["INT", char.attributes.intelligence],
                      ["SPI", char.attributes.spirit],
                      ["END", char.attributes.endurance],
                      ["LUC", char.attributes.luck],
                    ] as const
                  ).map(([abbr, val]) => (
                    <div key={abbr} className="rounded bg-muted/50 py-1">
                      <div className="text-xs text-muted-foreground">{abbr}</div>
                      <div className="text-sm font-medium">{val}</div>
                    </div>
                  ))}
                </div>
              )}

              {char.unallocatedPoints > 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Нераспределённых очков: {char.unallocatedPoints}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
