"use client";

import { useState, useTransition } from "react";
import { cn } from "@gob/ui";
import { upsertRuleConfig, deleteRuleConfig } from "@/actions/admin";

interface ConfigEntry {
  key: string;
  defaultValue: unknown;
  dbRow: { id: string; key: string; value: unknown; updatedAt: Date; updatedBy: string | null } | null;
}

export function RuleConfigEditor({ entries }: { entries: ConfigEntry[] }) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <ConfigRow key={entry.key} entry={entry} />
      ))}
    </div>
  );
}

function ConfigRow({ entry }: { entry: ConfigEntry }) {
  const current = entry.dbRow?.value ?? entry.defaultValue;
  const [draft, setDraft] = useState(JSON.stringify(current, null, 2));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOverridden = entry.dbRow !== null;

  function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft) as unknown;
    } catch {
      setError("Невалидный JSON");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await upsertRuleConfig({ key: entry.key, value: parsed });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  function reset() {
    startTransition(async () => {
      await deleteRuleConfig(entry.key);
      setDraft(JSON.stringify(entry.defaultValue, null, 2));
      setEditing(false);
    });
  }

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-2",
      isOverridden && "border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/20",
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{entry.key}</code>
          {isOverridden && (
            <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-800 dark:text-amber-200">
              переопределено
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {isOverridden && !editing && (
            <button
              onClick={reset}
              disabled={isPending}
              className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              Сбросить
            </button>
          )}
          {!editing ? (
            <button
              onClick={() => { setEditing(true); }}
              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Изменить
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => { setEditing(false); setDraft(JSON.stringify(current, null, 2)); setError(null); }}
                disabled={isPending}
                className="rounded border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={save}
                disabled={isPending}
                className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "…" : "Сохранить"}
              </button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-1">
          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(null); }}
            rows={draft.split("\n").length + 1}
            className={cn(
              "w-full resize-y rounded border bg-background p-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring",
              error && "border-destructive",
            )}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <p className="text-[10px] text-muted-foreground">
            Умолчание: <code className="font-mono">{JSON.stringify(entry.defaultValue)}</code>
          </p>
        </div>
      ) : (
        <pre className="overflow-x-auto rounded bg-muted p-2 text-xs font-mono">
          {JSON.stringify(current)}
        </pre>
      )}
    </div>
  );
}
