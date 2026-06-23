"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@gob/ui";
import { createItemInSlot } from "@/actions/characters";

interface ItemTemplateSummary {
  id: string;
  name: string;
  slotType: string;
  tier: number;
  weaponFamily: string | null;
  damageDice: string | null;
  bonusCritDice: string | null;
  statBonuses: Record<string, number> | null;
  description: string | null;
}

interface ModifyForm {
  name: string;
  tier: string;
  weaponFamily: string;
  damageDice: string;
  bonusCritDice: string;
  statBonuses: string;
  description: string;
}

interface Props {
  characterId: string;
  slot: string;
  slotLabel: string;
  slotType: string;
  onClose: () => void;
}

export function EquipmentPickerDialog({ characterId, slot, slotLabel, slotType, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState<ItemTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [pending, startTransition] = useTransition();
  const [modifying, setModifying] = useState<{ template: ItemTemplateSummary; form: ModifyForm } | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!modifying) inputRef.current?.focus();
  }, [modifying]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ slotType });
    if (query) params.set("q", query);

    fetch(`/api/item-templates?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: ItemTemplateSummary[]) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => ctrl.abort();
  }, [query, slotType]);

  function pick(templateId: string) {
    startTransition(async () => {
      await createItemInSlot({ characterId, slot, templateId });
      onClose();
    });
  }

  function pickCustom() {
    if (!customName.trim()) return;
    startTransition(async () => {
      await createItemInSlot({ characterId, slot, customName: customName.trim() });
      onClose();
    });
  }

  function openModify(t: ItemTemplateSummary) {
    setModifying({
      template: t,
      form: {
        name: `${t.name} (Модиф)`,
        tier: t.tier.toString(),
        weaponFamily: t.weaponFamily ?? "",
        damageDice: t.damageDice ?? "",
        bonusCritDice: t.bonusCritDice ?? "",
        statBonuses: t.statBonuses ? JSON.stringify(t.statBonuses, null, 2) : "",
        description: t.description ?? "",
      },
    });
  }

  function submitModify() {
    if (!modifying) return;
    const { template, form } = modifying;

    let statBonusesParsed: Record<string, number> | undefined;
    if (form.statBonuses.trim()) {
      try { statBonusesParsed = JSON.parse(form.statBonuses); }
      catch { return; }
    }

    const overrides: Record<string, unknown> = {};
    if (form.name.trim() !== template.name) overrides.name = form.name.trim();
    const tierNum = parseInt(form.tier, 10);
    if (!isNaN(tierNum) && tierNum !== template.tier) overrides.tier = tierNum;
    if (form.weaponFamily.trim() !== (template.weaponFamily ?? "")) overrides.weaponFamily = form.weaponFamily.trim() || null;
    if (form.damageDice.trim() !== (template.damageDice ?? "")) overrides.damageDice = form.damageDice.trim() || null;
    if (form.bonusCritDice.trim() !== (template.bonusCritDice ?? "")) overrides.bonusCritDice = form.bonusCritDice.trim() || null;
    if (statBonusesParsed !== undefined) overrides.statBonuses = statBonusesParsed;
    if (form.description.trim() !== (template.description ?? "")) overrides.description = form.description.trim() || null;

    startTransition(async () => {
      await createItemInSlot({ characterId, slot, templateId: template.id, overrides });
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
          <h2 className="text-sm font-semibold">
            {modifying
              ? <>Модификация — <span className="text-muted-foreground font-normal">{modifying.template.name}</span></>
              : <>Снаряжение — <span className="text-muted-foreground font-normal">{slotLabel}</span></>}
          </h2>
          <div className="flex items-center gap-3">
            {modifying && (
              <button
                type="button"
                onClick={() => setModifying(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Назад
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        {modifying ? (
          <ModifyFormView
            form={modifying.form}
            onChange={(form) => setModifying((prev) => prev ? { ...prev, form } : null)}
            onSubmit={submitModify}
            pending={pending}
          />
        ) : (
          <>
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

            {/* Template list */}
            <div className="overflow-y-auto flex-1 divide-y">
              {loading && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
              )}
              {!loading && templates.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Нет подходящих шаблонов
                </p>
              )}
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3",
                    pending && "opacity-50 pointer-events-none",
                  )}
                >
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => pick(t.id)}
                    className="flex items-start gap-3 flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
                  >
                    <TierBadge tier={t.tier} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.weaponFamily && <>{t.weaponFamily} · </>}
                        {t.damageDice && <>{t.damageDice} · </>}
                        {t.statBonuses &&
                          Object.entries(t.statBonuses)
                            .map(([k, v]) => `+${v} ${k}`)
                            .join(", ")}
                      </p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{t.description}</p>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openModify(t)}
                    className="shrink-0 self-center text-xs text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
                  >
                    Модиф.
                  </button>
                </div>
              ))}
            </div>

            {/* Custom item */}
            <div className="px-4 py-3 border-t shrink-0">
              {!showCustom ? (
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  + Создать предмет вручную
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Название предмета…"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
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
                    Добавить
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModifyFormView({
  form,
  onChange,
  onSubmit,
  pending,
}: {
  form: ModifyForm;
  onChange: (form: ModifyForm) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const [jsonError, setJsonError] = useState(false);

  function setField<K extends keyof ModifyForm>(k: K, v: string) {
    onChange({ ...form, [k]: v });
    if (k === "statBonuses") {
      try { if (v.trim()) JSON.parse(v); setJsonError(false); }
      catch { setJsonError(true); }
    }
  }

  return (
    <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        Изменения сохраняются как overrides экземпляра предмета. Базовый шаблон остаётся нетронутым.
      </p>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Название</label>
        <input
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Тир</label>
          <input
            type="number" min={1} max={10}
            value={form.tier}
            onChange={(e) => setField("tier", e.target.value)}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Семейство оружия</label>
          <input
            value={form.weaponFamily}
            onChange={(e) => setField("weaponFamily", e.target.value)}
            placeholder="—"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Кубик урона</label>
          <input
            value={form.damageDice}
            onChange={(e) => setField("damageDice", e.target.value)}
            placeholder="напр. 1d6"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Бонусный крит-кубик</label>
          <input
            value={form.bonusCritDice}
            onChange={(e) => setField("bonusCritDice", e.target.value)}
            placeholder="напр. 1d4"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Бонусы характеристик (JSON)</label>
        <textarea
          value={form.statBonuses}
          onChange={(e) => setField("statBonuses", e.target.value)}
          rows={2}
          placeholder='{"strength": 2}'
          className={cn(
            "w-full resize-none rounded border bg-background px-2 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-ring",
            jsonError && "border-destructive",
          )}
        />
        {jsonError && <p className="text-xs text-destructive">Некорректный JSON</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Описание</label>
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={2}
          className="w-full resize-none rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="button"
        disabled={pending || jsonError}
        onClick={onSubmit}
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
      >
        {pending ? "…" : "Надеть модифицированный"}
      </button>
    </div>
  );
}

function TierBadge({ tier }: { tier: number }) {
  return (
    <span className="shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
      {tier}
    </span>
  );
}
