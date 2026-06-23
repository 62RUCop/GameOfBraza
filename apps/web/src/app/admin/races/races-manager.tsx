"use client";

import { useState, useTransition } from "react";
import type { Race } from "@gob/db";
import { cn } from "@gob/ui";
import { upsertRace, softDeleteRace, restoreRace } from "@/actions/admin";

export function RacesManager({ races }: { races: Race[] }) {
  const [showDeleted, setShowDeleted] = useState(false);
  const visible = showDeleted ? races : races.filter((r) => !r.deletedAt);

  return (
    <div className="space-y-4">
      <AddRaceForm />

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => { setShowDeleted(e.target.checked); }}
          />
          Показать удалённые
        </label>
      </div>

      <div className="rounded-lg border divide-y">
        {visible.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">Нет записей</p>
        )}
        {visible.map((race) => (
          <RaceRow key={race.id} race={race} />
        ))}
      </div>
    </div>
  );
}

function AddRaceForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) { setError("Введите название"); return; }
    setError(null);
    startTransition(async () => {
      const trimmedDesc = description.trim();
      const result = await upsertRace({ name: name.trim(), ...(trimmedDesc ? { description: trimmedDesc } : {}) });
      if ("error" in result) {
        setError(result.error);
      } else {
        setName("");
        setDescription("");
      }
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-semibold">Добавить расу</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder="Название"
          className="flex-1 rounded border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <input
          value={description}
          onChange={(e) => { setDescription(e.target.value); }}
          placeholder="Описание (необязательно)"
          className="flex-1 rounded border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={submit}
          disabled={isPending}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "…" : "Добавить"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RaceRow({ race }: { race: Race }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(race.name);
  const [description, setDescription] = useState(race.description ?? "");
  const [isPending, startTransition] = useTransition();

  const isDeleted = !!race.deletedAt;

  function save() {
    startTransition(async () => {
      const trimmedDesc = description.trim();
      await upsertRace({ id: race.id, name: name.trim(), ...(trimmedDesc ? { description: trimmedDesc } : {}) });
      setEditing(false);
    });
  }

  function toggleDelete() {
    startTransition(async () => {
      if (isDeleted) {
        await restoreRace(race.id);
      } else {
        await softDeleteRace(race.id);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          className="flex-1 rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={description}
          onChange={(e) => { setDescription(e.target.value); }}
          className="flex-1 rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Описание"
        />
        <button onClick={save} disabled={isPending} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50">
          {isPending ? "…" : "OK"}
        </button>
        <button onClick={() => { setEditing(false); }} className="rounded border px-2 py-1 text-xs hover:bg-accent">Отмена</button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2", isDeleted && "opacity-50")}>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{race.name}</span>
        {race.description && (
          <span className="ml-2 text-xs text-muted-foreground truncate">{race.description}</span>
        )}
        {isDeleted && <span className="ml-2 text-[10px] text-destructive">удалена</span>}
      </div>
      <button onClick={() => { setEditing(true); }} className="text-xs text-muted-foreground hover:text-foreground">
        Изменить
      </button>
      <button
        onClick={toggleDelete}
        disabled={isPending}
        className={cn("text-xs disabled:opacity-50", isDeleted ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive/80")}
      >
        {isDeleted ? "Восстановить" : "Удалить"}
      </button>
    </div>
  );
}
