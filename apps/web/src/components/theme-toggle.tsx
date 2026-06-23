"use client";

import { useTheme } from "next-themes";
import { cn } from "@gob/ui";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", label: "Светлая" },
    { value: "dark", label: "Тёмная" },
    { value: "system", label: "Как в системе" },
  ] as const;

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={cn(
            "rounded-md border px-4 py-2 text-sm transition-colors",
            theme === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-accent",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
