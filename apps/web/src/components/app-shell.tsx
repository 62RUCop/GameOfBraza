"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@gob/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/characters" className="font-bold tracking-tight">
              GoB
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/characters"
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname.startsWith("/characters") ? "text-foreground font-medium" : "text-foreground/60",
                )}
              >
                Персонажи
              </Link>
              {session?.user.role === "admin" && (
                <Link
                  href="/admin"
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    pathname.startsWith("/admin") ? "text-foreground font-medium" : "text-foreground/60",
                  )}
                >
                  Справочники
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:block">{session?.user.email}</span>
            <Link
              href="/settings"
              className={cn(
                "rounded-md px-3 py-1.5 hover:bg-accent",
                pathname.startsWith("/settings") ? "bg-accent" : "",
              )}
            >
              Настройки
            </Link>
            <button
              onClick={() => void signOut({ callbackUrl: "/sign-in" })}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-accent"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
