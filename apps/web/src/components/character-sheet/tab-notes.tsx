"use client";

import { useState, useTransition } from "react";
import { cn } from "@gob/ui";
import { updatePlayerNotes } from "@/actions/characters";
import type { FullCharacter } from "./character-sheet";

interface Props {
  character: FullCharacter;
  canEdit: boolean;
}

function NotesBlock({
  label,
  initialValue,
  placeholder,
  canEdit,
  onSave,
}: {
  label: string;
  initialValue: string;
  placeholder: string;
  canEdit: boolean;
  onSave: (v: string) => Promise<{ error: string } | { ok: boolean }>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await onSave(value);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={isPending || saved}
            className={cn(
              "rounded-md px-3 py-1 text-xs transition-colors",
              saved
                ? "text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
              isPending && "opacity-70",
            )}
          >
            {isPending ? "Сохранение…" : saved ? "Сохранено" : "Сохранить"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <textarea
        value={value}
        onChange={handleChange}
        disabled={!canEdit}
        rows={5}
        placeholder={placeholder}
        className={cn(
          "w-full resize-y rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-offset-background",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !canEdit && "cursor-default opacity-80",
        )}
      />
    </div>
  );
}

export function TabNotes({ character, canEdit }: Props) {
  return (
    <div className="space-y-6">
      <NotesBlock
        label="Бафы"
        initialValue={character.buffs ?? ""}
        placeholder="Активные бафы отсутствуют"
        canEdit={canEdit}
        onSave={(v) => updatePlayerNotes({ characterId: character.id, buffs: v })}
      />
      <NotesBlock
        label="Дебафы"
        initialValue={character.debuffs ?? ""}
        placeholder="Активные дебафы отсутствуют"
        canEdit={canEdit}
        onSave={(v) => updatePlayerNotes({ characterId: character.id, debuffs: v })}
      />
      <NotesBlock
        label="Заметки"
        initialValue={character.playerNotes ?? ""}
        placeholder="Заметок пока нет"
        canEdit={canEdit}
        onSave={(v) => updatePlayerNotes({ characterId: character.id, notes: v })}
      />
    </div>
  );
}
