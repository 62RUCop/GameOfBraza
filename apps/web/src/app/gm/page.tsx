import { prisma } from "@gob/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateCampaignForm } from "./create-campaign-form";

export default async function GmPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(session.user.role !== "admin" ? { gmId: session.user.id } : {}),
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Кампании</h1>
      </div>

      <CreateCampaignForm />

      <div className="space-y-2">
        {campaigns.length === 0 && (
          <p className="text-sm text-muted-foreground">Нет кампаний. Создайте первую.</p>
        )}
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/gm/${campaign.id}`}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <div>
              <p className="font-medium">{campaign.name}</p>
            </div>
            <span className="text-sm text-muted-foreground">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
