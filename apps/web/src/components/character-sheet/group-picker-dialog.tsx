"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateCharacterInfo } from "@/actions/characters";

interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  characterId: string;
  currentGroupId: string | null;
  onClose: () => void;
}

export function GroupPickerDialog({ characterId, currentGroupId, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
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

    fetch(`/api/groups?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: GroupSummary[]) => { setGroups(data); setLoading(false); })
      .catch(() => { setLoading(false); });

    return () => { ctrl.abort(); };
  }, [query]);

  function pick(groupId: string) {
    startTransition(async () => {
      await updateCharacterInfo({ characterId, groupId, groupName: null });
      onClose();
    });
  }

  function pickCustom() {
    if (!customName.trim()) return;
    startTransition(async () => {
      await updateCharacterInfo({ characterId, groupId: null, groupName: customName.trim() });
      onClose();
    });
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b shrink-0">
          <h2 className="text-sm font-semibold">Выбор группировки</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

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

        <div className="overflow-y-auto flex-1 divide-y">
          {loading && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
          )}
          {!loading && groups.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Группировки не найдены</p>
          )}
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              disabled={pending}
              onClick={() => { pick(g.id); }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {g.id === currentGroupId && (
                <span className="mt-0.5 shrink-0 text-primary">✓</span>
              )}
              <div className={g.id === currentGroupId ? "" : "pl-5"}>
                <p className="text-sm font-medium">{g.name}</p>
                {g.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{g.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Custom free-text group */}
        <div className="px-4 py-3 border-t shrink-0">
          {!showCustom ? (
            <button
              type="button"
              onClick={() => { setShowCustom(true); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              + Указать группировку вручную
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Название группировки…"
                value={customName}
                onChange={(e) => { setCustomName(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") pickCustom(); }}
                autoFocus
                className="flex-1 rounded-md border bg-muted/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                disabled={!customName.trim() || pending}
                onClick={pickCustom}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >
                Сохранить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
