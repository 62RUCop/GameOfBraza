import { auth } from "@/lib/auth";
import { NewCharacterForm } from "@/components/new-character-form";

export default async function NewCharacterPage() {
  const session = await auth();
  if (!session) return null;
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Создать персонажа</h1>
      <NewCharacterForm ownerId={session.user.id} />
    </div>
  );
}
