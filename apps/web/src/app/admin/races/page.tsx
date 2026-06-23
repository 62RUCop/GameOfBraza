import { prisma } from "@gob/db";
import { RacesManager } from "./races-manager";

export default async function AdminRacesPage() {
  const races = await prisma.race.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Расы</h1>
      <RacesManager races={races} />
    </div>
  );
}
