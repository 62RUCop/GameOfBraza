"use client";

import { useState, useTransition } from "react";
import { formatCurrency, toBronze } from "@gob/rules";
import type { RuleConfig } from "@gob/rules";
import type { FullCharacter } from "./character-sheet";
import type { BackpackItemType, BackpackSlot } from "@gob/db";
import { upsertBackpackSlot, clearBackpackSlot, updateCurrencyBalance } from "@/actions/characters";
import { cn } from "@gob/ui";

interface Props {
  character: FullCharacter;
  canEdit: boolean;
  ruleConfig: RuleConfig;
}

const ITEM_TYPE_LABELS: Record<BackpackItemType, string> = {
  food: "Еда",
  scroll: "Свиток",
  herb: "Трава",
  potion: "Зелье",
  misc: "Разное",
  quest: "Квест",
  other: "Прочее",
};

const ITEM_TYPES = Object.keys(ITEM_TYPE_LABELS) as BackpackItemType[];

interface SlotDraft {
  itemName: string;
  itemType: BackpackItemType;
  quantity: number;
  description: string;
}

export function TabBackpack({ character, canEdit, ruleConfig }: Props) {
  const currency = character.currency;
  const balance = currency ? currency.balanceBronze : 0;
  const fmt = formatCurrency(balance, ruleConfig);

  const slots = character.backpackSlots;
  const slotMap = new Map(slots.map((s) => [s.slotIndex, s]));

  return (
    <div className="space-y-6">
      {/* Currency */}
      <CurrencyCard
        characterId={character.id}
        balance={balance}
        fmt={fmt}
        canEdit={canEdit}
        ruleConfig={ruleConfig}
      />

      {/* Backpack slots */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Рюкзак (6 слотов)
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => i + 1).map((idx) => (
            <BackpackSlotCard
              key={idx}
              characterId={character.id}
              slotIndex={idx}
              slot={slotMap.get(idx)}
              canEdit={canEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BackpackSlotCard({
  characterId,
  slotIndex,
  slot,
  canEdit,
}: {
  characterId: string;
  slotIndex: number;
  slot: BackpackSlot | undefined;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<SlotDraft>({
    itemName: "",
    itemType: "misc",
    quantity: 1,
    description: "",
  });

  function openEdit() {
    setDraft({
      itemName: slot?.itemName ?? "",
      itemType: slot?.itemType ?? "misc",
      quantity: slot?.quantity ?? 1,
      description: slot?.description ?? "",
    });
    setEditing(true);
  }

  function save() {
    if (!draft.itemName.trim()) { clear(); return; }
    startTransition(async () => {
      const trimmedDesc = draft.description.trim();
      await upsertBackpackSlot({
        characterId,
        slotIndex,
        itemName: draft.itemName.trim(),
        itemType: draft.itemType,
        quantity: Math.max(1, draft.quantity),
        ...(trimmedDesc ? { description: trimmedDesc } : {}),
      });
      setEditing(false);
    });
  }

  function clear() {
    if (!slot) { setEditing(false); return; }
    startTransition(async () => {
      await clearBackpackSlot({ characterId, slotIndex });
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Слот {slotIndex}</span>
        </div>
        <input
          autoFocus
          value={draft.itemName}
          onChange={(e) => { setDraft((d) => ({ ...d, itemName: e.target.value })); }}
          placeholder="Название предмета"
          className="w-full rounded border bg-background px-2 py-1 text-sm outline-none ring-1 ring-ring focus:ring-2"
        />
        <div className="flex gap-2">
          <select
            value={draft.itemType}
            onChange={(e) => { setDraft((d) => ({ ...d, itemType: e.target.value as BackpackItemType })); }}
            className="flex-1 rounded border bg-background px-2 py-1 text-xs outline-none"
          >
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={draft.quantity}
            onChange={(e) => { setDraft((d) => ({ ...d, quantity: parseInt(e.target.value, 10) || 1 })); }}
            className="w-16 rounded border bg-background px-2 py-1 text-xs outline-none"
            placeholder="Кол."
          />
        </div>
        <textarea
          value={draft.description}
          onChange={(e) => { setDraft((d) => ({ ...d, description: e.target.value })); }}
          placeholder="Описание (необязательно)"
          rows={2}
          className="w-full resize-none rounded border bg-background px-2 py-1 text-xs outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={isPending}
            className="flex-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "…" : "Сохранить"}
          </button>
          {slot && (
            <button
              onClick={clear}
              disabled={isPending}
              className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              Очистить
            </button>
          )}
          <button
            onClick={() => { setEditing(false); }}
            disabled={isPending}
            className="rounded border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative min-h-[80px] rounded-lg border p-3 transition-colors",
        canEdit && "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
        isPending && "opacity-60",
      )}
      onClick={() => { if (canEdit) openEdit(); }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Слот {slotIndex}</span>
        {slot && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {ITEM_TYPE_LABELS[slot.itemType]}
          </span>
        )}
      </div>
      {slot ? (
        <div>
          <p className="text-sm font-medium">{slot.itemName}</p>
          {slot.quantity > 1 && (
            <p className="text-xs text-muted-foreground">× {slot.quantity}</p>
          )}
          {slot.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{slot.description}</p>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground/40">
          {canEdit ? "Нажмите, чтобы добавить" : "— пусто —"}
        </span>
      )}
    </div>
  );
}

function CurrencyCard({
  characterId,
  balance,
  fmt,
  canEdit,
  ruleConfig,
}: {
  characterId: string;
  balance: number;
  fmt: { gold: number; silver: number; bronze: number };
  canEdit: boolean;
  ruleConfig: RuleConfig;
}) {
  const [isPending, startTransition] = useTransition();

  function save(newFmt: { gold: number; silver: number; bronze: number }) {
    const newBalance = toBronze(newFmt, ruleConfig);
    if (newBalance === balance) return;
    startTransition(async () => {
      await updateCurrencyBalance({ characterId, newBalanceBronze: newBalance, reason: "ручная правка" });
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Кошелёк
      </h3>
      <div className={cn("flex flex-wrap gap-4", isPending && "opacity-60")}>
        <CoinInput
          value={fmt.gold}
          label="золото"
          color="text-yellow-600 dark:text-yellow-400"
          canEdit={canEdit}
          onCommit={(v) => { save({ ...fmt, gold: v }); }}
        />
        <CoinInput
          value={fmt.silver}
          label="серебро"
          color="text-slate-400"
          canEdit={canEdit}
          onCommit={(v) => { save({ ...fmt, silver: v }); }}
        />
        <CoinInput
          value={fmt.bronze}
          label="бронза"
          color="text-orange-600 dark:text-orange-400"
          canEdit={canEdit}
          onCommit={(v) => { save({ ...fmt, bronze: v }); }}
        />
      </div>
      {canEdit && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Нажмите на число чтобы изменить. Итого: {balance} бр.
        </p>
      )}
      {!canEdit && (
        <p className="mt-2 text-[11px] text-muted-foreground">Итого: {balance} бр.</p>
      )}
    </div>
  );
}

function CoinInput({
  value,
  label,
  color,
  canEdit,
  onCommit,
}: {
  value: number;
  label: string;
  color: string;
  canEdit: boolean;
  onCommit: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    const v = parseInt(draft, 10);
    if (!isNaN(v) && v >= 0) {
      onCommit(v);
    }
    setEditing(false);
    setDraft(String(value));
  }

  if (editing && canEdit) {
    return (
      <div className="flex items-baseline gap-1">
        <input
          autoFocus
          type="number"
          min={0}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setEditing(false); setDraft(String(value)); }
          }}
          className={`w-16 rounded border bg-background px-1 py-0.5 text-2xl font-bold tabular-nums outline-none ring-2 ring-ring ${color}`}
        />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-1">
      <button
        onClick={() => { if (canEdit) { setDraft(String(value)); setEditing(true); } }}
        className={cn(`text-2xl font-bold tabular-nums ${color}`, canEdit && "hover:underline decoration-dashed")}
      >
        {value}
      </button>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
