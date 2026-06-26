"use client";

import { useState, useTransition } from "react";
import type { Skill, SkillType } from "@gob/db";
import { cn } from "@gob/ui";
import { upsertSkill, softDeleteSkill, restoreSkill } from "@/actions/admin";

const SKILL_TYPES: SkillType[] = ["innate", "acquired"];
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

const EMPTY_FORM: SkillFormData = {
  name: "",
  description: "",
  skillType: "acquired",
  occupiesSlot: true,
  tier: 1,
  guildId: "",
  manaCost: "",
  apCost: "",
  authorName: "",
};

function skillToForm(s: Skill): SkillFormData {
  return {
    name: s.name,
    description: s.description ?? "",
    skillType: s.skillType,
    occupiesSlot: s.occupiesSlot,
    tier: s.tier,
    guildId: s.guildId ?? "",
    manaCost: s.manaCost?.toString() ?? "",
    apCost: s.apCost?.toString() ?? "",
    authorName: s.authorName ?? "",
  };
}

export function SkillsManager({ skills }: { skills: Skill[] }) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const visible = showDeleted ? skills : skills.filter((s) => !s.deletedAt);

  return (
    <div className="space-y-4">
      {editingId === "new" ? (
        <SkillForm
          initialData={EMPTY_FORM}
          onCancel={() => { setEditingId(null); }}
          onSaved={() => { setEditingId(null); }}
        />
      ) : (
        <button
          onClick={() => { setEditingId("new"); }}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Добавить скилл
        </button>
      )}

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); }} />
        Показать удалённые
      </label>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Название</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Тип</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Тир</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Ячейка</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Мана/ОД</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Автор</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Нет записей</td></tr>
            )}
            {visible.map((skill) =>
              editingId === skill.id ? (
                <tr key={skill.id}>
                  <td colSpan={6} className="px-3 py-2">
                    <SkillForm
                      initialData={skillToForm(skill)}
                      editingId={skill.id}
                      onCancel={() => { setEditingId(null); }}
                      onSaved={() => { setEditingId(null); }}
                    />
                  </td>
                </tr>
              ) : (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  onEdit={() => { setEditingId(skill.id); }}
                />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkillForm({
  initialData,
  editingId,
  onCancel,
  onSaved,
}: {
  initialData: SkillFormData;
  editingId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SkillFormData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof SkillFormData>(k: K, v: SkillFormData[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function submit() {
    if (!form.name.trim()) { setError("Введите название"); return; }
    setError(null);
    startTransition(async () => {
      const trimmedDesc = form.description.trim();
      const trimmedGuild = form.guildId.trim();
      const manaCostVal = form.manaCost ? parseInt(form.manaCost, 10) : undefined;
      const apCostVal = form.apCost ? parseInt(form.apCost, 10) : undefined;
      const trimmedAuthor = form.authorName.trim();
      const result = await upsertSkill({
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        ...(trimmedDesc ? { description: trimmedDesc } : {}),
        skillType: form.skillType,
        occupiesSlot: form.occupiesSlot,
        tier: form.tier,
        ...(trimmedGuild ? { guildId: trimmedGuild } : {}),
        ...(manaCostVal !== undefined ? { manaCost: manaCostVal } : {}),
        ...(apCostVal !== undefined ? { apCost: apCostVal } : {}),
        ...(trimmedAuthor ? { authorName: trimmedAuthor } : {}),
      });
      if ("error" in result) { setError(result.error); } else { onSaved(); }
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-background">
      <p className="text-sm font-semibold">{editingId ? "Редактировать скилл" : "Новый скилл"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Название *</label>
          <input value={form.name} onChange={(e) => { setField("name", e.target.value); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Тип</label>
          <select value={form.skillType} onChange={(e) => { setField("skillType", e.target.value as SkillType); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none">
            {SKILL_TYPES.map((t) => <option key={t} value={t}>{SKILL_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Тир</label>
          <input type="number" min={1} max={10} value={form.tier} onChange={(e) => { setField("tier", parseInt(e.target.value, 10) || 1); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Стоимость маны</label>
          <input type="number" min={0} value={form.manaCost} onChange={(e) => { setField("manaCost", e.target.value); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="—" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Стоимость ОД</label>
          <input type="number" min={0} value={form.apCost} onChange={(e) => { setField("apCost", e.target.value); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="—" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Гильдия (ID)</label>
          <input value={form.guildId} onChange={(e) => { setField("guildId", e.target.value); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="—" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Автор</label>
          <input value={form.authorName} onChange={(e) => { setField("authorName", e.target.value); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="—" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="occupiesSlot" checked={form.occupiesSlot}
            onChange={(e) => { setField("occupiesSlot", e.target.checked); }} />
          <label htmlFor="occupiesSlot" className="text-sm cursor-pointer">Занимает ячейку способностей</label>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Описание</label>
        <textarea value={form.description} onChange={(e) => { setField("description", e.target.value); }} rows={3}
          className="w-full resize-none rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={isPending}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {isPending ? "…" : "Сохранить"}
        </button>
        <button onClick={onCancel} className="rounded border px-3 py-1.5 text-sm hover:bg-accent">Отмена</button>
      </div>
    </div>
  );
}

function SkillRow({ skill, onEdit }: { skill: Skill; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();
  const isDeleted = !!skill.deletedAt;

  function toggle() {
    startTransition(async () => {
      if (isDeleted) { await restoreSkill(skill.id); } else { await softDeleteSkill(skill.id); }
    });
  }

  return (
    <tr className={cn(isDeleted && "opacity-50")}>
      <td className="px-3 py-2">
        <span className="font-medium">{skill.name}</span>
        {isDeleted && <span className="ml-2 text-[10px] text-destructive">удалён</span>}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{SKILL_TYPE_LABELS[skill.skillType]}</td>
      <td className="px-3 py-2 text-center">{skill.tier}</td>
      <td className="px-3 py-2 text-center">{skill.occupiesSlot ? "да" : "нет"}</td>
      <td className="px-3 py-2 text-center text-muted-foreground">
        {skill.manaCost ?? "—"}/{skill.apCost ?? "—"}
      </td>
      <td className="px-3 py-2 text-muted-foreground text-sm">{skill.authorName ?? "—"}</td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-2">
          <button onClick={onEdit} className="text-xs text-muted-foreground hover:text-foreground">Изменить</button>
          <button onClick={toggle} disabled={isPending}
            className={cn("text-xs disabled:opacity-50", isDeleted ? "text-green-600" : "text-destructive")}>
            {isDeleted ? "Восстановить" : "Удалить"}
          </button>
        </div>
      </td>
    </tr>
  );
}
