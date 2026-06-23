"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCharacterToCampaign, removeCharacterFromCampaign, createNpc } from "@/actions/gm";

interface Props {
  campaignId: string;
  allCharacters: { id: string; name: string }[];
  partyIds: string[];
}

export function PartyControls({ campaignId, allCharacters, partyIds }: Props) {
  const router = useRouter();
  const available = allCharacters.filter((c) => !partyIds.includes(c.id));

  const [selectedId, setSelectedId] = useState(available[0]?.id ?? "");
  const [npcName, setNpcName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addCharacter() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await addCharacterToCampaign(campaignId, selectedId);
      if ("error" in result) setError(result.error);
    });
  }

  function spawnNpc() {
    if (!npcName.trim()) { setError("Введите имя NPC"); return; }
    setError(null);
    startTransition(async () => {
      const result = await createNpc({ name: npcName.trim(), campaignId });
      if ("error" in result) {
        setError(result.error);
      } else {
        setNpcName("");
        router.push(`/characters/${result.id}`);
      }
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Add existing character */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-semibold">Добавить персонажа в кампанию</p>
        {available.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет доступных персонажей</p>
        ) : (
          <div className="flex gap-2">
            <select
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); }}
              className="flex-1 rounded border bg-background px-2 py-1.5 text-sm outline-none"
            >
              {available.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={addCharacter}
              disabled={isPending || !selectedId}
              className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "…" : "Добавить"}
            </button>
          </div>
        )}
      </div>

      {/* Create NPC */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-semibold">Создать NPC</p>
        <div className="flex gap-2">
          <input
            value={npcName}
            onChange={(e) => { setNpcName(e.target.value); }}
            placeholder="Имя NPC"
            onKeyDown={(e) => { if (e.key === "Enter") spawnNpc(); }}
            className="flex-1 rounded border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={spawnNpc}
            disabled={isPending}
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "…" : "Создать"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive col-span-2">{error}</p>}

      {/* Remove characters */}
      {partyIds.length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-foreground mb-2">Убрать из кампании:</p>
          <div className="flex flex-wrap gap-2">
            {partyIds.map((id) => {
              const char = allCharacters.find((c) => c.id === id);
              return (
                <RemoveButton
                  key={id}
                  label={char?.name ?? id}
                  onRemove={() => {
                    startTransition(async () => {
                      await removeCharacterFromCampaign(campaignId, id);
                    });
                  }}
                  isPending={isPending}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RemoveButton({
  label,
  onRemove,
  isPending,
}: {
  label: string;
  onRemove: () => void;
  isPending: boolean;
}) {
  return (
    <button
      onClick={onRemove}
      disabled={isPending}
      className="flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs hover:bg-destructive/10 hover:border-destructive hover:text-destructive disabled:opacity-50"
    >
      {label} ×
    </button>
  );
}
