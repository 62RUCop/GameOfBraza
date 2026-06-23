import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { cn } from "@gob/ui";

const NAV_ITEMS = [
  { href: "/admin/rules", label: "Правила (RuleConfig)" },
  { href: "/admin/races", label: "Расы" },
  { href: "/admin/groups", label: "Группировки" },
  { href: "/admin/skills", label: "Скиллы" },
  { href: "/admin/items", label: "Предметы" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user.role !== "admin") {
    redirect("/characters");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-muted/30 p-4">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Администратор</p>
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm hover:bg-accent",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t pt-4">
          <Link href="/characters" className="block rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-accent">
            ← К персонажам
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
