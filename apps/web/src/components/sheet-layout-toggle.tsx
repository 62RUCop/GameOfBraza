"use client";

import { cn } from "@gob/ui";
import { setSheetLayout, useSheetLayout, type SheetLayout } from "./use-sheet-layout";

export function SheetLayoutToggle() {
  const layout = useSheetLayout();

  const options: { value: SheetLayout; label: string }[] = [
    { value: "tabs", label: "По вкладкам" },
    { value: "continuous", label: "Сплошной" },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => { setSheetLayout(opt.value); }}
          className={cn(
            "rounded-md border px-4 py-2 text-sm transition-colors",
            layout === opt.value
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
