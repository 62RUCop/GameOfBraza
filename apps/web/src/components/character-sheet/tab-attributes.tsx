"use client";

import { useState, useTransition } from "react";
import { cn } from "@gob/ui";
import {
  computeDerived,
  attributePowerTier,
  classIndex,
  DEFAULT_RULE_CONFIG,
} from "@gob/rules";
import type { Role } from "@gob/db";
import type { FullCharacter } from "./character-sheet";
import { updateRuntimeValues, allocatePoints, updateDerivedOverride, setBaseAttribute } from "@/actions/characters";

interface Props {
  character: FullCharacter;
  canEdit: boolean;
  viewerRole: Role;
}

const STAT_KEYS = ["strength", "dexterity", "intelligence", "spirit", "endurance", "luck"] as const;
type StatKey = (typeof STAT_KEYS)[number];

const STAT_LABELS: Record<StatKey, string> = {
  strength: "Сила",
  dexterity: "Ловкость",
  intelligence: "Интеллект",
  spirit: "Дух",
  endurance: "Выносливость",
  luck: "Удача",
};

const STAT_SHORT: Record<StatKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  intelligence: "INT",
  spirit: "SPI",
  endurance: "END",
  luck: "LUC",
};

function pointCost(from: number, to: number): number {
  let cost = 0;
  if (from < to) {
    for (let v = from; v < to; v++) cost += v < 4 ? 1 : v - 2;
  } else {
    for (let v = to; v < from; v++) cost -= v < 4 ? 1 : v - 2;
  }
  return cost;
}

export function TabAttributes({ character, canEdit }: Props) {
  const attrs = character.attributes;
  const [allocMode, setAllocMode] = useState(false);
  const [deltas, setDeltas] = useState<Partial<Record<StatKey, number>>>({});
  const [allocError, setAllocError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!attrs) {
    return <p className="text-muted-foreground text-sm">Характеристики не заданы</p>;
  }
  const a = attrs; // non-null alias: TypeScript loses narrowing in deferred callbacks

  const stats = {
    str: a.strength,
    dex: a.dexterity,
    int: a.intelligence,
    spi: a.spirit,
    end: a.endurance,
    luc: a.luck,
  };

  const rt = character.runtimeState;
  const derived = computeDerived(stats, { hp: 0 }, DEFAULT_RULE_CONFIG);
  const cfg = DEFAULT_RULE_CONFIG;

  const totalCost = STAT_KEYS.reduce((sum, k) => {
    const d = deltas[k] ?? 0;
    return sum + pointCost(a[k], a[k] + d);
  }, 0);
  const remaining = character.unallocatedPoints - totalCost;
  const hasDeltas = STAT_KEYS.some((k) => (deltas[k] ?? 0) !== 0);

  function adjustDelta(key: StatKey, inc: number) {
    setDeltas((prev) => {
      const cur = prev[key] ?? 0;
      const newVal = a[key] + cur + inc;
      if (newVal < 0 || newVal > 255) return prev;
      const nd = cur + inc;
      const merged = { ...prev, [key]: nd };
      return Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== 0),
      );
    });
  }

  function cancelAlloc() {
    setDeltas({});
    setAllocError(null);
    setAllocMode(false);
  }

  function confirmAlloc() {
    if (!hasDeltas) return;
    setAllocError(null);
    startTransition(async () => {
      const result = await allocatePoints({ characterId: character.id, deltas });
      if (result.error) {
        setAllocError(result.error);
      } else {
        setDeltas({});
        setAllocMode(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Unallocated points banner */}
      {character.unallocatedPoints > 0 && !allocMode && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Нераспределённых очков: <span className="text-lg font-bold">{character.unallocatedPoints}</span>
          </p>
          {canEdit && (
            <button
              onClick={() => { setAllocMode(true); }}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            >
              Распределить
            </button>
          )}
        </div>
      )}

      {/* Allocation mode toolbar */}
      {allocMode && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Режим распределения очков</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Осталось очков:{" "}
                <span className={cn("font-bold tabular-nums", remaining < 0 && "text-destructive")}>
                  {remaining}
                </span>
                {totalCost !== 0 && (
                  <span className="ml-2 text-muted-foreground">
                    ({totalCost > 0 ? "+" : ""}{totalCost} к стоимости)
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={cancelAlloc}
                disabled={isPending}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmAlloc}
                disabled={!hasDeltas || remaining < 0 || isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Сохранение…" : "Применить"}
              </button>
            </div>
          </div>
          {allocError && (
            <p className="text-xs text-destructive">{allocError}</p>
          )}
        </div>
      )}

      {/* Base stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_KEYS.map((key) => {
          const delta = deltas[key] ?? 0;
          const displayValue = attrs[key] + delta;
          const tier = attributePowerTier(displayValue);
          const cls = classIndex(displayValue, cfg.classThresholds);
          const cost = delta !== 0 ? pointCost(attrs[key], displayValue) : 0;

          return (
            <StatCard
              key={key}
              label={STAT_LABELS[key]}
              short={STAT_SHORT[key]}
              value={displayValue}
              baseValue={attrs[key]}
              delta={delta}
              tier={tier}
              classIndex={cls}
              allocMode={allocMode}
              cost={cost}
              canDecrement={displayValue > 0}
              canIncrement={displayValue < 255}
              onDecrement={() => { adjustDelta(key, -1); }}
              onIncrement={() => { adjustDelta(key, 1); }}
              isGmEditable={canEdit && !allocMode}
              characterId={character.id}
              statKey={key}
            />
          );
        })}
      </div>

      {/* Current live values */}
      {rt && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Текущие значения
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <LiveValueRow
              label="HP"
              current={rt.currentHp}
              max={rt.hpMaxManualOverride && rt.hpMaxOverride != null ? rt.hpMaxOverride : derived.hpMax}
              characterId={character.id}
              field="currentHp"
              canEdit={canEdit}
            />
            <LiveValueRow
              label="Мана"
              current={rt.currentMana}
              max={rt.manaMaxManualOverride && rt.manaMaxOverride != null ? rt.manaMaxOverride : derived.manaMax}
              characterId={character.id}
              field="currentMana"
              canEdit={canEdit}
            />
            <LiveValueRow
              label="ОД"
              current={rt.currentAp}
              max={rt.apMaxManualOverride && rt.apMaxOverride != null ? rt.apMaxOverride : derived.apMax}
              characterId={character.id}
              field="currentAp"
              canEdit={canEdit}
            />
          </div>
          {canEdit && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Нажмите на число чтобы изменить. Для HP/маны/ОД можно задать значение выше максимума (оверхил).
            </p>
          )}
        </div>
      )}

      {/* Derived stats */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Производные показатели
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <EditableDerivedRow
            label="Макс. HP"
            suggested={derived.hpMax}
            override={rt?.hpMaxOverride ?? null}
            isManual={rt?.hpMaxManualOverride ?? false}
            characterId={character.id}
            field="hpMax"
            canEdit={canEdit}
          />
          <EditableDerivedRow
            label="Макс. мана"
            suggested={derived.manaMax}
            override={rt?.manaMaxOverride ?? null}
            isManual={rt?.manaMaxManualOverride ?? false}
            characterId={character.id}
            field="manaMax"
            canEdit={canEdit}
          />
          <EditableDerivedRow
            label="Макс. ОД"
            suggested={derived.apMax}
            override={rt?.apMaxOverride ?? null}
            isManual={rt?.apMaxManualOverride ?? false}
            characterId={character.id}
            field="apMax"
            canEdit={canEdit}
          />
          <EditableDerivedRow
            label="Ячейки способностей"
            suggested={derived.slots}
            override={rt?.slotsOverride ?? null}
            isManual={rt?.slotsManualOverride ?? false}
            characterId={character.id}
            field="slots"
            canEdit={canEdit}
          />
          <EditableDerivedRow
            label="Бонус крита"
            suggested={derived.critBonus}
            override={rt?.critBonusOverride ?? null}
            isManual={rt?.critBonusManualOverride ?? false}
            characterId={character.id}
            field="critBonus"
            canEdit={canEdit}
          />
          <LiveBubbleRow
            label="Бабл (заряды)"
            charges={rt?.bubbleCharges ?? 0}
            characterId={character.id}
            canEdit={canEdit}
          />
        </div>
      </div>

    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  short,
  value,
  baseValue,
  delta,
  tier,
  classIndex: clsIdx,
  allocMode,
  cost,
  canDecrement,
  canIncrement,
  onDecrement,
  onIncrement,
  isGmEditable = false,
  characterId,
  statKey,
}: {
  label: string;
  short: string;
  value: number;
  baseValue: number;
  delta: number;
  tier: number;
  classIndex: number;
  allocMode: boolean;
  cost: number;
  canDecrement: boolean;
  canIncrement: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  isGmEditable?: boolean;
  characterId?: string;
  statKey?: StatKey;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [isPending, startTransition] = useTransition();

  const layers = Math.ceil(value / 20) || 1;
  const changed = delta !== 0;

  function commitGmEdit() {
    const v = parseInt(draft, 10);
    if (!isNaN(v) && v >= 0 && v <= 255 && v !== value && characterId && statKey) {
      startTransition(async () => {
        await setBaseAttribute({ characterId, stat: statKey, value: v });
        setEditing(false);
      });
    } else {
      setEditing(false);
      setDraft(String(value));
    }
  }

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3 transition-colors",
      changed && "border-primary/60 bg-primary/5",
    )}>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{label}</span>
        <div className="flex items-baseline gap-2">
          {allocMode ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDecrement}
                disabled={!canDecrement}
                className="flex h-6 w-6 items-center justify-center rounded border text-sm font-bold hover:bg-accent disabled:opacity-30"
                aria-label={`Уменьшить ${label}`}
              >
                −
              </button>
              <span className={cn("w-10 text-center text-2xl font-bold tabular-nums", changed && "text-primary")}>
                {value}
              </span>
              <button
                onClick={onIncrement}
                disabled={!canIncrement}
                className="flex h-6 w-6 items-center justify-center rounded border text-sm font-bold hover:bg-accent disabled:opacity-30"
                aria-label={`Увеличить ${label}`}
              >
                +
              </button>
            </div>
          ) : isGmEditable && editing ? (
            <input
              autoFocus
              type="number"
              min={0}
              max={255}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); }}
              onBlur={commitGmEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitGmEdit();
                if (e.key === "Escape") { setEditing(false); setDraft(String(value)); }
              }}
              className="w-16 rounded border bg-background px-1 py-0.5 text-2xl font-bold tabular-nums outline-none ring-2 ring-ring"
            />
          ) : (
            <button
              disabled={isPending}
              onClick={() => { if (isGmEditable) { setDraft(String(value)); setEditing(true); } }}
              className={cn("text-2xl font-bold tabular-nums", isGmEditable && "hover:underline decoration-dashed")}
            >
              {value}
            </button>
          )}
        </div>
      </div>

      {/* Delta hint */}
      {allocMode && changed && (
        <p className="text-xs text-primary">
          {delta > 0 ? "+" : ""}{delta} от базы {baseValue} · стоимость {cost > 0 ? "+" : ""}{cost}
        </p>
      )}

      {/* Cell strip */}
      {Array.from({ length: Math.min(layers, 2) }).map((_, layerIdx) => {
        const start = layerIdx * 20;
        const cellsInLayer = Math.min(value - start, 20);
        return (
          <CellStrip
            key={layerIdx}
            filled={cellsInLayer}
            total={20}
            dim={layerIdx > 0}
          />
        );
      })}
      {layers > 2 && (
        <p className="text-xs text-muted-foreground">…ещё {layers - 2} слой(-я)</p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Тир {tier} ({short})</span>
        {clsIdx >= 0 && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            Класс {clsIdx + 1}
          </span>
        )}
      </div>
    </div>
  );
}

function CellStrip({ filled, total, dim }: { filled: number; total: number; dim?: boolean }) {
  return (
    <div className={cn("flex gap-0.5", dim && "opacity-60")}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-3 flex-1 rounded-sm transition-colors",
            i < filled
              ? dim
                ? "bg-primary/60"
                : "bg-primary"
              : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

// ─── Live value row (editable current HP/mana/AP) ────────────────────────────

function LiveValueRow({
  label,
  current,
  max,
  characterId,
  field,
  canEdit,
}: {
  label: string;
  current: number;
  max: number;
  characterId: string;
  field: "currentHp" | "currentMana" | "currentAp";
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(current));
  const [isPending, startTransition] = useTransition();

  const outOfRange = current > max;
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));

  function commit() {
    const val = parseInt(draft, 10);
    if (!isNaN(val)) {
      startTransition(async () => {
        await updateRuntimeValues({ characterId, [field]: val });
        setEditing(false);
      });
    } else {
      setEditing(false);
      setDraft(String(current));
    }
  }

  return (
    <div className={cn("rounded-lg border p-3", outOfRange && "border-amber-300 dark:border-amber-700")}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {outOfRange && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400">оверхил</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        {editing && canEdit ? (
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditing(false); setDraft(String(current)); }
            }}
            className="w-16 rounded border bg-background px-1 py-0.5 text-xl font-bold tabular-nums outline-none ring-2 ring-ring"
          />
        ) : (
          <button
            onClick={() => { if (canEdit) { setDraft(String(current)); setEditing(true); } }}
            disabled={isPending}
            className={cn("text-xl font-bold tabular-nums", canEdit && "hover:underline decoration-dashed")}
          >
            {current}
          </button>
        )}
        <span className="text-sm text-muted-foreground">/ {max}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            outOfRange ? "bg-amber-400" : pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500",
          )}
          style={{ width: `${Math.min(pct, 100).toString()}%` }}
        />
      </div>
    </div>
  );
}

// ─── Derived value row (read-only) ────────────────────────────────────────────

function _DerivedRow({
  label,
  suggested,
  override,
  isManual,
}: {
  label: string;
  suggested: number;
  override: number | null;
  isManual: boolean;
}) {
  const displayValue = isManual && override !== null ? override : suggested;
  const outOfRange = displayValue !== suggested;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3",
        outOfRange && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
        {isManual && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground" title="Закреплено вручную">
            ручн.
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 tabular-nums">
        <span className="text-lg font-bold">{displayValue}</span>
        {outOfRange && <span className="text-xs text-muted-foreground">(рассч. {suggested})</span>}
      </div>
    </div>
  );
}

// ─── Editable derived row (with manual override) ──────────────────────────────

function EditableDerivedRow({
  label,
  suggested,
  override,
  isManual,
  characterId,
  field,
  canEdit,
}: {
  label: string;
  suggested: number;
  override: number | null;
  isManual: boolean;
  characterId: string;
  field: "hpMax" | "manaMax" | "apMax" | "slots" | "critBonus";
  canEdit: boolean;
}) {
  const displayValue = isManual && override !== null ? override : suggested;
  const outOfRange = displayValue !== suggested;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(displayValue));
  const [isPending, startTransition] = useTransition();

  function commit() {
    const v = parseInt(draft, 10);
    if (!isNaN(v) && v !== displayValue) {
      startTransition(async () => {
        await updateDerivedOverride({ characterId, field, value: v });
        setEditing(false);
      });
    } else {
      setEditing(false);
      setDraft(String(displayValue));
    }
  }

  function reset(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await updateDerivedOverride({ characterId, field, value: null });
    });
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3",
        outOfRange && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm truncate">{label}</span>
        {isManual && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0" title="Закреплено вручную">
            ручн.
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 tabular-nums shrink-0">
        {editing && canEdit ? (
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditing(false); setDraft(String(displayValue)); }
            }}
            className="w-16 rounded border bg-background px-1 py-0.5 text-lg font-bold tabular-nums outline-none ring-2 ring-ring"
          />
        ) : (
          <button
            disabled={isPending}
            onClick={() => { if (canEdit) { setDraft(String(displayValue)); setEditing(true); } }}
            className={cn("text-lg font-bold", canEdit && "hover:underline decoration-dashed")}
          >
            {displayValue}
          </button>
        )}
        {outOfRange && !editing && (
          <span className="text-xs text-muted-foreground">(рассч. {suggested})</span>
        )}
        {isManual && canEdit && !editing && (
          <button
            onClick={reset}
            disabled={isPending}
            className="ml-1 text-[10px] text-muted-foreground hover:text-destructive"
            title="Сбросить override"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Live bubble charges row ──────────────────────────────────────────────────

function LiveBubbleRow({
  label,
  charges,
  characterId,
  canEdit,
}: {
  label: string;
  charges: number;
  characterId: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(charges));
  const [isPending, startTransition] = useTransition();

  function commit() {
    const v = parseInt(draft, 10);
    if (!isNaN(v) && v !== charges) {
      startTransition(async () => {
        await updateRuntimeValues({ characterId, bubbleCharges: v });
        setEditing(false);
      });
    } else {
      setEditing(false);
      setDraft(String(charges));
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <span className="text-sm">{label}</span>
      <div className="tabular-nums">
        {editing && canEdit ? (
          <input
            autoFocus
            type="number"
            min={0}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditing(false); setDraft(String(charges)); }
            }}
            className="w-16 rounded border bg-background px-1 py-0.5 text-lg font-bold tabular-nums outline-none ring-2 ring-ring"
          />
        ) : (
          <button
            disabled={isPending}
            onClick={() => { if (canEdit) { setDraft(String(charges)); setEditing(true); } }}
            className={cn("text-lg font-bold", canEdit && "hover:underline decoration-dashed")}
          >
            {charges}
          </button>
        )}
      </div>
    </div>
  );
}
