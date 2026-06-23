import { prisma } from "@gob/db";
import { ItemsManager } from "./items-manager";

export default async function AdminItemsPage() {
  const raw = await prisma.itemTemplate.findMany({
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });

  const items = raw.map((t) => ({
    ...t,
    referencePrice: t.referencePrice.toString(),
    scalingCoefficient: t.scalingCoefficient?.toString() ?? null,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Шаблоны предметов</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Создавайте и редактируйте шаблоны напрямую. Soft-delete сохраняет экземпляры у персонажей.
        </p>
      </div>
      <ItemsManager items={items} />
    </div>
  );
}
