"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateCharacterInfo } from "@/actions/characters";

interface RaceSummary {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  characterId: string;
  currentRaceId: string | null;
  onClose: () => void;
}

export function RacePickerDialog({ characterId, currentRaceId, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [races, setRaces] = useState<RaceSummary[]>([]);
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

    fetch(`/api/races?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: RaceSummary[]) => { setRaces(data); setLoading(false); })
      .catch(() => setLoading(false));

    return () => ctrl.abort();
  }, [query]);

  function pick(raceId: string) {
    startTransition(async () => {
      await updateCharacterInfo({ characterId, raceId });
      onClose();
    });
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b shrink-0">
          <h2 className="text-sm font-semibold">Выбор расы</h2>
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
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border bg-muted/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Race list */}
        <div className="overflow-y-auto flex-1 divide-y">
          {loading && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
          )}
          {!loading && races.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Расы не найдены</p>
          )}
          {races.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={pending}
              onClick={() => pick(r.id)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {r.id === currentRaceId && (
                <span className="mt-0.5 shrink-0 text-primary">✓</span>
              )}
              <div className={r.id === currentRaceId ? "" : "pl-5"}>
                <p className="text-sm font-medium">{r.name}</p>
                {r.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
