import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function GmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user.role !== "gm" && session?.user.role !== "admin") {
    redirect("/characters");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-sm">ГМ-панель</span>
          <nav className="flex gap-4">
            <Link href="/gm" className="text-sm text-muted-foreground hover:text-foreground">Кампании</Link>
          </nav>
        </div>
        <Link href="/characters" className="text-xs text-muted-foreground hover:text-foreground">← К персонажам</Link>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
