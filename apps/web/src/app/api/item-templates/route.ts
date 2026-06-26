import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@gob/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const slotType = searchParams.get("slotType") ?? undefined;
  const q        = searchParams.get("q") ?? undefined;

  // Both hand slots accept any weapon or shield
  const weaponSlotTypes = ["weapon_left", "weapon_right"];
  const slotTypeFilter = slotType
    ? weaponSlotTypes.includes(slotType)
      ? { slotType: { in: weaponSlotTypes as never[] } }
      : { slotType: slotType as never }
    : {};

  const templates = await prisma.itemTemplate.findMany({
    where: {
      deletedAt: null,
      ...slotTypeFilter,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      slotType: true,
      tier: true,
      weaponFamily: true,
      damageDice: true,
      bonusCritDice: true,
      description: true,
    },
  });

  return NextResponse.json(templates);
}
