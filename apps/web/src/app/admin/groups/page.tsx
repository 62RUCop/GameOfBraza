import { prisma } from "@gob/db";
import { GroupsManager } from "./groups-manager";

export default async function AdminGroupsPage() {
  const raw = await prisma.group.findMany({ orderBy: { name: "asc" } });
  const groups = raw.map((g) => ({
    ...g,
    modifierValue: g.modifierValue?.toNumber() ?? null,
  }));
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Группировки</h1>
      <GroupsManager groups={groups} />
    </div>
  );
}
