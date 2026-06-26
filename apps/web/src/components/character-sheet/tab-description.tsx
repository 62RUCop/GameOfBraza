"use client";

import { useState, useTransition } from "react";
import { cn } from "@gob/ui";
import type { FullCharacter } from "./character-sheet";
import { updateCharacterInfo } from "@/actions/characters";
import { RacePickerDialog } from "./race-picker-dialog";
import { GroupPickerDialog } from "./group-picker-dialog";

interface Props {
  character: FullCharacter;
  canEdit: boolean;
}

export function TabDescription({ character, canEdit }: Props) {
  const [racePickerOpen, setRacePickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {racePickerOpen && (
        <RacePickerDialog
          characterId={character.id}
          currentRaceId={character.raceId ?? null}
          onClose={() => { setRacePickerOpen(false); }}
        />
      )}
      {groupPickerOpen && (
        <GroupPickerDialog
          characterId={character.id}
          currentGroupId={character.groupId ?? null}
          onClose={() => { setGroupPickerOpen(false); }}
        />
      )}
      <Section title="Основное">
        <EditableTextField
          label="Имя"
          value={character.name}
          canEdit={canEdit}
          onCommit={(v) => updateCharacterInfo({ characterId: character.id, name: v })}
        />
        <RaceField
          value={character.raceName ?? character.race?.name ?? "—"}
          canEdit={canEdit}
          onOpen={() => { setRacePickerOpen(true); }}
        />
        <PickerField
          label="Группировка"
          value={character.groupName ?? character.group?.name ?? "—"}
          canEdit={canEdit}
          onOpen={() => { setGroupPickerOpen(true); }}
        />
        <EditableNumberField
          label="Стадия квеста"
          value={character.questProgressStage}
          canEdit={canEdit}
          onCommit={(v) => updateCharacterInfo({ characterId: character.id, questProgressStage: v })}
        />
      </Section>

      <Section title="Изображение">
        <AppearanceImageField
          value={character.appearanceImage ?? ""}
          canEdit={canEdit}
          onCommit={(v) => updateCharacterInfo({ characterId: character.id, appearanceImage: v || null })}
        />
      </Section>

      <Section title="Квента" className="sm:col-span-2">
        <EditableTextareaField
          value={character.quenta ?? ""}
          canEdit={canEdit}
          placeholder="Квента не заполнена"
          onCommit={(v) => updateCharacterInfo({ characterId: character.id, quenta: v || null })}
        />
      </Section>

      <Section title="Главный квест" className="sm:col-span-2">
        <EditableTextareaField
          value={character.mainQuest ?? ""}
          canEdit={canEdit}
          placeholder="Главный квест не заполнен"
          onCommit={(v) => updateCharacterInfo({ characterId: character.id, mainQuest: v || null })}
        />
      </Section>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border p-4 ${className ?? ""}`}>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}


function RaceField({ value, canEdit, onOpen }: { value: string; canEdit: boolean; onOpen: () => void }) {
  return <PickerField label="Раса" value={value} canEdit={canEdit} onOpen={onOpen} />;
}

function PickerField({ label, value, canEdit, onOpen }: { label: string; value: string; canEdit: boolean; onOpen: () => void }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <button
        onClick={() => { if (canEdit) onOpen(); }}
        className={cn("text-sm font-medium", canEdit && "hover:underline decoration-dashed")}
      >
        {value}
      </button>
    </div>
  );
}

// ─── Inline editable text field ───────────────────────────────────────────────

function EditableTextField({
  label,
  value,
  canEdit,
  onCommit,
}: {
  label: string;
  value: string;
  canEdit: boolean;
  onCommit: (v: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();

  function commit() {
    if (draft.trim() === value) { setEditing(false); return; }
    startTransition(async () => {
      await onCommit(draft.trim() || value);
      setEditing(false);
    });
  }

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setEditing(false); setDraft(value); }
          }}
          className="min-w-0 flex-1 rounded border bg-background px-2 py-0.5 text-right text-sm font-medium outline-none ring-2 ring-ring"
        />
      ) : (
        <button
          disabled={isPending}
          onClick={() => { if (canEdit) { setDraft(value); setEditing(true); } }}
          className={cn("text-sm font-medium", canEdit && "hover:underline decoration-dashed")}
        >
          {value}
        </button>
      )}
    </div>
  );
}

// ─── Inline editable number field ─────────────────────────────────────────────

function EditableNumberField({
  label,
  value,
  canEdit,
  onCommit,
}: {
  label: string;
  value: number;
  canEdit: boolean;
  onCommit: (v: number) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [isPending, startTransition] = useTransition();

  function commit() {
    const v = parseInt(draft, 10);
    if (!isNaN(v) && v !== value) {
      startTransition(async () => {
        await onCommit(v);
        setEditing(false);
      });
    } else {
      setEditing(false);
      setDraft(String(value));
    }
  }

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      {editing ? (
        <input
          autoFocus
          type="number"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setEditing(false); setDraft(String(value)); }
          }}
          className="w-20 rounded border bg-background px-2 py-0.5 text-right text-sm font-medium outline-none ring-2 ring-ring"
        />
      ) : (
        <button
          disabled={isPending}
          onClick={() => { if (canEdit) { setDraft(String(value)); setEditing(true); } }}
          className={cn("text-sm font-medium", canEdit && "hover:underline decoration-dashed")}
        >
          {value}
        </button>
      )}
    </div>
  );
}

// ─── Appearance image field ───────────────────────────────────────────────────

function AppearanceImageField({
  value,
  canEdit,
  onCommit,
}: {
  value: string;
  canEdit: boolean;
  onCommit: (v: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();

  function commit() {
    if (draft === value) { setEditing(false); return; }
    startTransition(async () => {
      await onCommit(draft.trim());
      setEditing(false);
    });
  }

  return (
    <div className="space-y-3">
      {value && (
        <img
          src={value}
          alt="Изображение персонажа"
          className="w-full rounded-md object-cover max-h-64"
        />
      )}
      {!value && !canEdit && (
        <p className="text-sm text-muted-foreground">Не задано</p>
      )}
      {editing ? (
        <div className="space-y-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => { setDraft(e.target.value); }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditing(false); setDraft(value); }
            }}
            placeholder="URL изображения"
            className="w-full rounded border bg-background px-2 py-1 text-sm outline-none ring-2 ring-ring"
          />
        </div>
      ) : canEdit ? (
        <button
          disabled={isPending}
          onClick={() => { setDraft(value); setEditing(true); }}
          className="text-xs text-muted-foreground hover:underline decoration-dashed"
        >
          {value ? "Изменить URL" : "Добавить URL изображения"}
        </button>
      ) : null}
    </div>
  );
}

// ─── Inline editable textarea ─────────────────────────────────────────────────

function EditableTextareaField({
  value,
  canEdit,
  placeholder,
  onCommit,
}: {
  value: string;
  canEdit: boolean;
  placeholder: string;
  onCommit: (v: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await onCommit(draft);
      setSaved(true);
      setEditing(false);
    });
  }

  if (!canEdit && !value) return null;

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={draft}
          onChange={handleChange}
          rows={5}
          className="w-full resize-y rounded border bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-2 ring-ring"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isPending || saved}
            className={cn(
              "rounded-md px-3 py-1 text-xs transition-colors",
              saved ? "text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90",
              isPending && "opacity-70",
            )}
          >
            {isPending ? "Сохранение…" : "Сохранить"}
          </button>
          <button
            onClick={() => { setEditing(false); setDraft(value); setSaved(true); }}
            className="rounded-md border px-3 py-1 text-xs hover:bg-accent"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => { if (canEdit) { setDraft(value); setSaved(true); setEditing(true); } }}
      className={cn(
        "min-h-[40px] rounded text-sm leading-relaxed",
        canEdit && "cursor-pointer hover:bg-muted/50 px-1 -mx-1 transition-colors",
        !value && "text-muted-foreground/60",
      )}
    >
      {value ? <p className="whitespace-pre-wrap">{value}</p> : <p>{placeholder}</p>}
    </div>
  );
}
