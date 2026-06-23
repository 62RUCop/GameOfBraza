"use client";

import { useState, useTransition } from "react";
import { cn } from "@gob/ui";
import { updatePlayerNotes } from "@/actions/characters";
import type { FullCharacter } from "./character-sheet";

interface Props {
  character: FullCharacter;
  canEdit: boolean;
}

export function TabNotes({ character, canEdit }: Props) {
  const [notes, setNotes] = useState(character.playerNotes ?? "");
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNotes(e.target.value);
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updatePlayerNotes({ characterId: character.id, notes });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Свободные заметки: трекинг квестов, NPC, напоминания.
        </p>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={isPending || saved}
            className={cn(
              "rounded-md px-3 py-1 text-sm transition-colors",
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
        value={notes}
        onChange={handleChange}
        disabled={!canEdit}
        rows={14}
        placeholder="Заметок пока нет"
        className={cn(
          "w-full resize-y rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-offset-background",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !canEdit && "cursor-default opacity-80",
        )}
      />
    </div>
  );
}
