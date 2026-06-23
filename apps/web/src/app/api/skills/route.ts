import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@gob/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const type = searchParams.get("type") ?? undefined;

  const skills = await prisma.skill.findMany({
    where: {
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(type ? { skillType: type as "innate" | "acquired" } : {}),
    },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
    take: 60,
    select: {
      id: true,
      name: true,
      description: true,
      skillType: true,
      occupiesSlot: true,
      tier: true,
      manaCost: true,
      apCost: true,
      icon: true,
    },
  });

  return NextResponse.json(skills);
}
