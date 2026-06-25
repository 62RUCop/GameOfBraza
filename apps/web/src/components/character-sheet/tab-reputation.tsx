"use client";

import { useState, useTransition } from "react";
import { cn } from "@gob/ui";
import { reputationLabel } from "@gob/rules";
import type { FullCharacter, FullReputation } from "./character-sheet";
import { updateReputation } from "@/actions/characters";

interface Props {
  character: FullCharacter;
  canEdit: boolean;
}

const LABEL_NAMES: Record<string, string> = {
  international_manhunt: "Международный розыск",
  villain: "Злодей",
  known_negative: "Известный (негативно)",
  stranger: "Незнакомец",
  known_positive: "Известный (позитивно)",
  hero: "Герой",
  legend: "Легенда",
};

const LABEL_COLORS: Record<string, string> = {
  international_manhunt: "text-red-700 dark:text-red-400",
  villain: "text-red-500 dark:text-red-400",
  known_negative: "text-orange-500 dark:text-orange-400",
  stranger: "text-muted-foreground",
  known_positive: "text-green-600 dark:text-green-400",
  hero: "text-blue-600 dark:text-blue-400",
  legend: "text-purple-600 dark:text-purple-400",
};

export function TabReputation({ character, canEdit }: Props) {
  return (
    <div className="space-y-3">
      {character.reputations.map((rep) => (
        <ReputationRow key={rep.raceId} rep={rep} characterId={character.id} canEdit={canEdit} />
      ))}
    </div>
  );
}

function ReputationRow({
  rep,
  characterId,
  canEdit,
}: {
  rep: FullReputation;
  characterId: string;
  canEdit: boolean;
}) {
  const [localValue, setLocalValue] = useState(rep.value);
  const [editingNumber, setEditingNumber] = useState(false);
  const [draft, setDraft] = useState(String(rep.value));
  const [isPending, startTransition] = useTransition();

  const label = reputationLabel(localValue);
  const labelName = LABEL_NAMES[label] ?? label;
  const colorClass = LABEL_COLORS[label] ?? "";

  function save(v: number) {
    if (v === rep.value) return;
    startTransition(async () => {
      await updateReputation({ characterId, raceId: rep.raceId, value: v });
    });
  }

  function commitNumber() {
    const v = Math.max(-10, Math.min(10, parseInt(draft, 10)));
    if (!isNaN(v)) {
      setLocalValue(v);
      save(v);
    } else {
      setDraft(String(localValue));
    }
    setEditingNumber(false);
  }

  // Fill: center-out from 0, negative fills left, positive fills right
  const zeroPercent = 50;
  const valuePercent = ((localValue + 10) / 20) * 100;
  const fillLeft = localValue < 0 ? valuePercent : zeroPercent;
  const fillWidth = Math.abs(valuePercent - zeroPercent);
  const isNegative = localValue < 0;
  const isNeutral = localValue === 0;

  const fillColor = isNeutral
    ? "bg-muted-foreground/30"
    : isNegative
      ? "bg-red-500"
      : "bg-green-500";

  return (
    <div className={cn("rounded-lg border p-4", isPending && "opacity-70")}>
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium">{rep.race.name}</span>
        <div className="flex items-center gap-2">
          {editingNumber && canEdit ? (
            <input
              autoFocus
              type="number"
              min={-10}
              max={10}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); }}
              onBlur={commitNumber}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNumber();
                if (e.key === "Escape") {
                  setEditingNumber(false);
                  setDraft(String(localValue));
                }
              }}
              className="w-16 rounded border bg-background px-1 py-0.5 text-right text-sm font-semibold tabular-nums outline-none ring-2 ring-ring"
            />
          ) : (
            <button
              disabled={isPending}
              onClick={() => {
                if (!canEdit) return;
                setDraft(String(localValue));
                setEditingNumber(true);
              }}
              className={cn(
                "min-w-[2.5rem] text-right text-sm font-semibold tabular-nums",
                colorClass,
                canEdit && "cursor-pointer hover:underline decoration-dashed",
              )}
            >
              {localValue > 0 ? `+${localValue.toString()}` : localValue.toString()}
            </button>
          )}
          <span className={cn("w-40 text-right text-xs", colorClass)}>{labelName}</span>
        </div>
      </div>

      {/* Slider + track */}
      <div className="relative h-4">
        {/* Track */}
        <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 overflow-hidden rounded-full bg-muted">
          {/* Fill: from 0 outward */}
          <div
            className={cn("absolute top-0 h-full rounded-full transition-none", fillColor)}
            style={{ left: `${fillLeft.toString()}%`, width: `${fillWidth.toString()}%` }}
          />
          {/* Center mark */}
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border/60" />
        </div>

        {/* Range input overlay */}
        <input
          type="range"
          min={-10}
          max={10}
          step={1}
          value={localValue}
          disabled={!canEdit || isPending}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setLocalValue(v);
            setDraft(String(v));
          }}
          onPointerUp={(e) => {
            const v = parseInt((e.target as HTMLInputElement).value, 10);
            save(v);
          }}
          className={cn(
            // Overlay over the track — absolute, full-width, transparent thumb track
            "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent outline-none border-0",
            // Thumb styles via Tailwind arbitrary
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:-mt-1",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-background",
            "[&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:transition-transform",
            "[&::-webkit-slider-thumb]:active:scale-125",
            isNegative
              ? "[&::-webkit-slider-thumb]:bg-red-500"
              : isNeutral
                ? "[&::-webkit-slider-thumb]:bg-muted-foreground/50"
                : "[&::-webkit-slider-thumb]:bg-green-500",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-2",
            "[&::-moz-range-thumb]:border-background",
            "[&::-moz-range-thumb]:shadow-sm",
            isNegative
              ? "[&::-moz-range-thumb]:bg-red-500"
              : isNeutral
                ? "[&::-moz-range-thumb]:bg-muted-foreground/50"
                : "[&::-moz-range-thumb]:bg-green-500",
            "[&::-webkit-slider-runnable-track]:h-2",
            "[&::-webkit-slider-runnable-track]:rounded-full",
            "[&::-moz-range-track]:h-2",
            "[&::-moz-range-track]:rounded-full",
            !canEdit && "cursor-not-allowed opacity-50",
          )}
        />
      </div>

      {/* Scale labels */}
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>−10</span>
        <span>0</span>
        <span>+10</span>
      </div>
    </div>
  );
}
