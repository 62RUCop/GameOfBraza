"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { SkillType } from "@gob/db";
import { cn } from "@gob/ui";
import { addCharacterSkill, createSkillAndAdd, updateSkillByPlayer } from "@/actions/characters";

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
  authorName: string | null;
}

interface Props {
  characterId: string;
  slotIndex: number;
  currentSkillId: string | null;
  existingSkillIds: string[];
  onClose: () => void;
  filterType?: "innate" | "acquired";
  editingSkill?: { id: string; name: string; description: string | null; skillType: string; occupiesSlot: boolean; tier: number; manaCost: number | null; apCost: number | null; guildId?: string | null; authorName?: string | null };
}

const TIER_COLORS: Record<number, string> = {
  1: "text-gray-500",
  2: "text-green-600",
  3: "text-blue-600",
  4: "text-purple-600",
  5: "text-amber-600",
};

const SKILL_TYPE_LABELS: Record<SkillType, string> = { innate: "Врождённый", acquired: "Приобретённый" };

interface SkillFormData {
  name: string;
  description: string;
  skillType: SkillType;
  occupiesSlot: boolean;
  tier: number;
  guildId: string;
  manaCost: string;
  apCost: string;
  authorName: string;
}

export function SkillPickerDialog({
  characterId,
  slotIndex,
  existingSkillIds,
  onClose,
  filterType,
  editingSkill,
}: Props) {
  const [mode, setMode] = useState<"pick" | "create" | "edit">(editingSkill ? "edit" : "pick");
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "pick") inputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (mode !== "pick") return;
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
  }, [query, filterType, mode]);

  function pick(skillId: string) {
    startTransition(async () => {
      await addCharacterSkill({ characterId, skillId });
      onClose();
    });
  }

  const available = skills.filter((s) => !existingSkillIds.includes(s.id));

  const headerTitle = editingSkill && mode === "edit"
    ? `Редактировать: ${editingSkill.name}`
    : filterType === "innate"
      ? "Врождённая способность"
      : <>Скилл — <span className="text-muted-foreground font-normal">ячейка {slotIndex + 1}</span></>;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b shrink-0">
          <h2 className="text-sm font-semibold">{headerTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Вкладки режимов. При редактировании текущего скилла первой идёт
            «Редактировать», но выбор/создание другого остаётся доступным. */}
        <div className="flex border-b shrink-0">
          {editingSkill && (
            <button
              type="button"
              onClick={() => { setMode("edit"); }}
              className={cn(
                "flex-1 px-4 py-2 text-xs font-medium transition-colors",
                mode === "edit"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Редактировать
            </button>
          )}
          <button
            type="button"
            onClick={() => { setMode("pick"); }}
            className={cn(
              "flex-1 px-4 py-2 text-xs font-medium transition-colors",
              mode === "pick"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Выбрать из каталога
          </button>
          <button
            type="button"
            onClick={() => { setMode("create"); }}
            className={cn(
              "flex-1 px-4 py-2 text-xs font-medium transition-colors",
              mode === "create"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            + Создать новый
          </button>
        </div>

        {mode === "pick" && (
          <>
            <div className="px-4 py-2 border-b shrink-0">
              <input
                ref={inputRef}
                type="text"
                placeholder="Поиск по названию или автору…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); }}
                className="w-full rounded-md border bg-muted/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

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
                      {s.authorName && <span className="text-muted-foreground/60">· {s.authorName}</span>}
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{s.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {(mode === "create" || mode === "edit") && (
          <SkillForm
            characterId={characterId}
            {...(filterType !== undefined ? { filterType } : {})}
            {...(mode === "edit" && editingSkill !== undefined ? { editingSkill } : {})}
            onSaved={onClose}
            onCancel={mode === "edit" ? onClose : () => { setMode(editingSkill ? "edit" : "pick"); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Форма создания / редактирования скилла ───────────────────────────────────

function SkillForm({
  characterId,
  filterType,
  editingSkill,
  onSaved,
  onCancel,
}: {
  characterId: string;
  filterType?: "innate" | "acquired";
  editingSkill?: Props["editingSkill"];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const defaultSkillType: SkillType = editingSkill
    ? (editingSkill.skillType as SkillType)
    : (filterType ?? "acquired");

  const [form, setForm] = useState<SkillFormData>({
    name: editingSkill?.name ?? "",
    description: editingSkill?.description ?? "",
    skillType: defaultSkillType,
    occupiesSlot: editingSkill ? editingSkill.occupiesSlot : filterType !== "innate",
    tier: editingSkill?.tier ?? 1,
    guildId: editingSkill?.guildId ?? "",
    manaCost: editingSkill?.manaCost?.toString() ?? "",
    apCost: editingSkill?.apCost?.toString() ?? "",
    authorName: editingSkill?.authorName ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof SkillFormData>(k: K, v: SkillFormData[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function submit() {
    if (!form.name.trim()) { setError("Введите название"); return; }
    setError(null);
    const manaCostVal = form.manaCost ? parseInt(form.manaCost, 10) : undefined;
    const apCostVal = form.apCost ? parseInt(form.apCost, 10) : undefined;
    const payload = {
      characterId,
      name: form.name.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      skillType: form.skillType,
      occupiesSlot: form.occupiesSlot,
      tier: form.tier,
      ...(form.guildId.trim() ? { guildId: form.guildId.trim() } : {}),
      ...(manaCostVal !== undefined ? { manaCost: manaCostVal } : {}),
      ...(apCostVal !== undefined ? { apCost: apCostVal } : {}),
      ...(form.authorName.trim() ? { authorName: form.authorName.trim() } : {}),
    };

    startTransition(async () => {
      const result = editingSkill
        ? await updateSkillByPlayer({ ...payload, skillId: editingSkill.id })
        : await createSkillAndAdd(payload);
      if ("error" in result) { setError(result.error); } else { onSaved(); }
    });
  }

  return (
    <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs text-muted-foreground">Название *</label>
          <input
            value={form.name}
            onChange={(e) => { setField("name", e.target.value); }}
            placeholder="Название способности"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Тип</label>
          <input
            readOnly
            value={SKILL_TYPE_LABELS[form.skillType]}
            className="w-full rounded border bg-muted/40 px-2 py-1.5 text-sm text-muted-foreground cursor-default outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Тир</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.tier}
            onChange={(e) => { setField("tier", parseInt(e.target.value, 10) || 1); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Стоимость маны</label>
          <input
            type="number"
            min={0}
            value={form.manaCost}
            onChange={(e) => { setField("manaCost", e.target.value); }}
            placeholder="—"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Стоимость ОД</label>
          <input
            type="number"
            min={0}
            value={form.apCost}
            onChange={(e) => { setField("apCost", e.target.value); }}
            placeholder="—"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Гильдия (ID)</label>
          <input
            value={form.guildId}
            onChange={(e) => { setField("guildId", e.target.value); }}
            placeholder="—"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Автор</label>
          <input
            value={form.authorName}
            onChange={(e) => { setField("authorName", e.target.value); }}
            placeholder="Заполнится автоматически"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="skill-form-occupiesSlot"
            checked={form.occupiesSlot}
            onChange={(e) => { setField("occupiesSlot", e.target.checked); }}
          />
          <label htmlFor="skill-form-occupiesSlot" className="text-sm cursor-pointer">Занимает ячейку</label>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Описание</label>
        <textarea
          value={form.description}
          onChange={(e) => { setField("description", e.target.value); }}
          rows={3}
          placeholder="Описание эффекта…"
          className="w-full resize-none rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={isPending}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "…" : editingSkill ? "Сохранить" : "Создать и добавить"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Цвета по тиру ────────────────────────────────────────────────────────────

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
