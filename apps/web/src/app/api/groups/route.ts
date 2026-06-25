import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@gob/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? undefined;

  const groups = await prisma.group.findMany({
    where: {
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  return NextResponse.json(groups);
}
