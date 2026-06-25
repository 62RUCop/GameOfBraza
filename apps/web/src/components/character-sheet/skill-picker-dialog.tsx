"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@gob/ui";
import { addCharacterSkill } from "@/actions/characters";

interface SkillSummary {
  id: string;
  name: string;
  description: string | null;
  skillType: string;
  occupiesSlot: boolean;
  tier: number;
  manaCost: number | null;
  apCost: number | null;
  icon: string | null;
}

interface Props {
  characterId: string;
  slotIndex: number;
  currentSkillId: string | null;
  existingSkillIds: string[];
  onClose: () => void;
  filterType?: "innate" | "acquired";
}

const TIER_COLORS: Record<number, string> = {
  1: "text-gray-500",
  2: "text-green-600",
  3: "text-blue-600",
  4: "text-purple-600",
  5: "text-amber-600",
};

export function SkillPickerDialog({ characterId, slotIndex, existingSkillIds, onClose, filterType }: Props) {
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (filterType) params.set("type", filterType);

    fetch(`/api/skills?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: SkillSummary[]) => {
        setSkills(data);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });

    return () => { ctrl.abort(); };
  }, [query, filterType]);

  function pick(skillId: string) {
    startTransition(async () => {
      await addCharacterSkill({ characterId, skillId });
      onClose();
    });
  }

  const available = skills.filter((s) => !existingSkillIds.includes(s.id));

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b shrink-0">
          <h2 className="text-sm font-semibold">
            {filterType === "innate" ? "Врождённая способность" : <>Скилл — <span className="text-muted-foreground font-normal">ячейка {slotIndex + 1}</span></>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b shrink-0">
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск по названию…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            className="w-full rounded-md border bg-muted/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Skill list */}
        <div className="overflow-y-auto flex-1 divide-y">
          {loading && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
          )}
          {!loading && available.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Нет доступных скиллов
            </p>
          )}
          {available.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={pending}
              onClick={() => { pick(s.id); }}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                pending && "opacity-50 pointer-events-none",
              )}
            >
              {/* Icon circle */}
              <div className={cn(
                "shrink-0 mt-0.5 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base",
                tierBorderClass(s.tier),
                tierBgClass(s.tier),
              )}>
                {s.icon
                  ? <img src={s.icon} alt="" className="w-full h-full object-cover rounded-full" />
                  : <span className="text-white/80">✦</span>}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <span className={cn("text-[10px] font-semibold shrink-0", TIER_COLORS[s.tier] ?? "text-muted-foreground")}>
                    Т{s.tier}
                  </span>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                  {s.manaCost != null && <span>💧 {s.manaCost}</span>}
                  {s.apCost != null && <span>⚡ {s.apCost} ОД</span>}
                  {!s.occupiesSlot && <span className="italic">без ячейки</span>}
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{s.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function tierBorderClass(tier: number): string {
  const map: Record<number, string> = {
    1: "border-gray-400",
    2: "border-green-500",
    3: "border-blue-500",
    4: "border-purple-500",
    5: "border-amber-500",
  };
  return map[tier] ?? "border-gray-400";
}

function tierBgClass(tier: number): string {
  const map: Record<number, string> = {
    1: "bg-gradient-to-br from-gray-400 to-gray-600",
    2: "bg-gradient-to-br from-green-400 to-green-700",
    3: "bg-gradient-to-br from-blue-400 to-blue-700",
    4: "bg-gradient-to-br from-purple-400 to-purple-700",
    5: "bg-gradient-to-br from-amber-400 to-amber-700",
  };
  return map[tier] ?? "bg-gradient-to-br from-gray-400 to-gray-600";
}
