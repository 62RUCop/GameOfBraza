"use client";

import { useState, useTransition } from "react";
import type { ItemTemplate as PrismaItemTemplate, SlotType, StatAttribute } from "@gob/db";

type ItemTemplate = Omit<PrismaItemTemplate, "referencePrice" | "scalingCoefficient"> & {
  referencePrice: string;
  scalingCoefficient: string | null;
};
import { cn } from "@gob/ui";
import { upsertItemTemplate, softDeleteItemTemplate, restoreItemTemplate } from "@/actions/admin";

const SLOT_TYPES: SlotType[] = ["head", "body", "legs", "vambraces", "weapon_left", "weapon_right", "ring", "amulet", "pet", "consumable"];
const SLOT_LABELS: Record<SlotType, string> = {
  head: "Голова", body: "Тело", legs: "Ноги", vambraces: "Наручи",
  weapon_left: "Оружие (лев)", weapon_right: "Оружие (прав)",
  ring: "Кольцо", amulet: "Амулет", pet: "Питомец", consumable: "Расходник",
};

// Видимость полей по типу слота: боевые поля (урон/крит/двуручность) — только
// у оружия; характеристики и масштабирование — у любого надеваемого, кроме
// расходников. weaponFamily — общая «категория», показывается везде.
const WEAPON_SLOTS: SlotType[] = ["weapon_left", "weapon_right"];
const isWeaponSlot = (s: SlotType): boolean => WEAPON_SLOTS.includes(s);
const STAT_ATTRIBUTES: (StatAttribute | "")[] = ["", "strength", "dexterity", "intelligence", "spirit", "endurance", "luck"];
const STAT_LABELS: Record<string, string> = {
  "": "—", strength: "СИЛ", dexterity: "ЛОВ", intelligence: "ИНТ",
  spirit: "ДУХ", endurance: "ВЫН", luck: "УДА",
};

interface FormData {
  name: string;
  slotType: SlotType;
  tier: number;
  weaponFamily: string;
  isTwoHanded: boolean;
  requiredAttribute: StatAttribute | "";
  damageDice: string;
  bonusCritDice: string;
  scalingAttribute: StatAttribute | "";
  scalingCoefficient: string;
  referencePrice: string;
  description: string;
}

const EMPTY_FORM: FormData = {
  name: "", slotType: "weapon_right", tier: 1, weaponFamily: "",
  isTwoHanded: false, requiredAttribute: "", damageDice: "", bonusCritDice: "",
  scalingAttribute: "", scalingCoefficient: "",
  referencePrice: "0", description: "",
};

function templateToForm(t: ItemTemplate): FormData {
  return {
    name: t.name,
    slotType: t.slotType,
    tier: t.tier,
    weaponFamily: t.weaponFamily ?? "",
    isTwoHanded: t.isTwoHanded,
    requiredAttribute: t.requiredAttribute ?? "",
    damageDice: t.damageDice ?? "",
    bonusCritDice: t.bonusCritDice ?? "",
    scalingAttribute: t.scalingAttribute ?? "",
    scalingCoefficient: t.scalingCoefficient?.toString() ?? "",
    referencePrice: t.referencePrice,
    description: t.description ?? "",
  };
}

export function ItemsManager({ items }: { items: ItemTemplate[] }) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFormData, setNewFormData] = useState<FormData>(EMPTY_FORM);
  const visible = showDeleted ? items : items.filter((t) => !t.deletedAt);

  function openNew() { setNewFormData(EMPTY_FORM); setEditingId("new"); }
  function openCopy(item: ItemTemplate) {
    setNewFormData({ ...templateToForm(item), name: `${item.name} (Модиф)` });
    setEditingId("new");
  }

  return (
    <div className="space-y-4">
      {editingId === "new" ? (
        <ItemForm initialData={newFormData} onCancel={() => { setEditingId(null); }} onSaved={() => { setEditingId(null); }} />
      ) : (
        <button
          onClick={openNew}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Добавить предмет
        </button>
      )}

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); }} />
        Показать удалённые
      </label>

      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Название</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Слот</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Тир</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Семейство</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Урон</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Цена (бронза)</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">Нет записей</td></tr>
            )}
            {visible.map((item) =>
              editingId === item.id ? (
                <tr key={item.id}>
                  <td colSpan={7} className="px-3 py-2">
                    <ItemForm
                      initialData={templateToForm(item)}
                      editingId={item.id}
                      onCancel={() => { setEditingId(null); }}
                      onSaved={() => { setEditingId(null); }}
                    />
                  </td>
                </tr>
              ) : (
                <ItemRow key={item.id} item={item} onEdit={() => { setEditingId(item.id); }} onCopy={() => { openCopy(item); }} />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemForm({
  initialData, editingId, onCancel, onSaved,
}: {
  initialData: FormData;
  editingId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function submit() {
    if (!form.name.trim()) { setError("Введите название"); return; }
    setError(null);
    // Поля привязаны к типу слота: боевые — только у оружия, характеристики/
    // масштабирование — у любого надеваемого, кроме расходников. Это не игровая
    // блокировка (золотое правило 1), а форма данных под тип предмета.
    const isWeapon = isWeaponSlot(form.slotType);
    const isConsumable = form.slotType === "consumable";
    startTransition(async () => {
      const result = await upsertItemTemplate({
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        slotType: form.slotType,
        tier: form.tier,
        isTwoHanded: isWeapon ? form.isTwoHanded : false,
        referencePrice: parseFloat(form.referencePrice) || 0,
        ...(form.weaponFamily.trim() ? { weaponFamily: form.weaponFamily.trim() } : {}),
        ...(!isConsumable && form.requiredAttribute ? { requiredAttribute: form.requiredAttribute } : {}),
        ...(isWeapon && form.damageDice.trim() ? { damageDice: form.damageDice.trim() } : {}),
        ...(isWeapon && form.bonusCritDice.trim() ? { bonusCritDice: form.bonusCritDice.trim() } : {}),
        ...(!isConsumable && form.scalingAttribute ? { scalingAttribute: form.scalingAttribute } : {}),
        ...(!isConsumable && form.scalingCoefficient ? { scalingCoefficient: parseFloat(form.scalingCoefficient) } : {}),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
      });
      if ("error" in result) { setError(result.error); } else { onSaved(); }
    });
  }

  const isWeapon = isWeaponSlot(form.slotType);
  const isConsumable = form.slotType === "consumable";

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-background">
      <p className="text-sm font-semibold">{editingId ? "Редактировать предмет" : "Новый предмет"}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Название *</label>
          <input value={form.name} onChange={(e) => { setField("name", e.target.value); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Слот *</label>
          <select value={form.slotType} onChange={(e) => { setField("slotType", e.target.value as SlotType); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none">
            {SLOT_TYPES.map((s) => <option key={s} value={s}>{SLOT_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Тир *</label>
          <input type="number" min={1} max={10} value={form.tier} onChange={(e) => { setField("tier", parseInt(e.target.value, 10) || 1); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Семейство</label>
          <input value={form.weaponFamily} onChange={(e) => { setField("weaponFamily", e.target.value); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="—" />
        </div>
        {!isConsumable && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Требуемая характеристика</label>
            <select value={form.requiredAttribute} onChange={(e) => { setField("requiredAttribute", e.target.value as StatAttribute | ""); }}
              className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none">
              {STAT_ATTRIBUTES.map((a) => <option key={a} value={a}>{STAT_LABELS[a]}</option>)}
            </select>
          </div>
        )}
        {isWeapon && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Кубик урона</label>
            <input value={form.damageDice} onChange={(e) => { setField("damageDice", e.target.value); }}
              className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="напр. 1d6" />
          </div>
        )}
        {isWeapon && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Бонусный крит-кубик</label>
            <input value={form.bonusCritDice} onChange={(e) => { setField("bonusCritDice", e.target.value); }}
              className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="напр. 1d4" />
          </div>
        )}
        {!isConsumable && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Масштабирующая характеристика</label>
            <select value={form.scalingAttribute} onChange={(e) => { setField("scalingAttribute", e.target.value as StatAttribute | ""); }}
              className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none">
              {STAT_ATTRIBUTES.map((a) => <option key={a} value={a}>{STAT_LABELS[a]}</option>)}
            </select>
          </div>
        )}
        {!isConsumable && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Коэффициент масштабирования</label>
            <input type="number" step="0.001" value={form.scalingCoefficient} onChange={(e) => { setField("scalingCoefficient", e.target.value); }}
              className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="—" />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Цена (бронза)</label>
          <input type="number" min={0} step="0.01" value={form.referencePrice} onChange={(e) => { setField("referencePrice", e.target.value); }}
            className="w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {isWeapon && (
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="isTwoHanded" checked={form.isTwoHanded} onChange={(e) => { setField("isTwoHanded", e.target.checked); }} />
            <label htmlFor="isTwoHanded" className="text-sm cursor-pointer">Двуручное</label>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Описание</label>
        <textarea value={form.description} onChange={(e) => { setField("description", e.target.value); }} rows={2}
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

function ItemRow({ item, onEdit, onCopy }: { item: ItemTemplate; onEdit: () => void; onCopy: () => void }) {
  const [isPending, startTransition] = useTransition();
  const isDeleted = !!item.deletedAt;

  function toggle() {
    startTransition(async () => {
      if (isDeleted) { await restoreItemTemplate(item.id); } else { await softDeleteItemTemplate(item.id); }
    });
  }

  return (
    <tr className={cn(isDeleted && "opacity-50")}>
      <td className="px-3 py-2">
        <span className="font-medium">{item.name}</span>
        {isDeleted && <span className="ml-2 text-[10px] text-destructive">удалён</span>}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{SLOT_LABELS[item.slotType]}</td>
      <td className="px-3 py-2 text-center">{item.tier}</td>
      <td className="px-3 py-2 text-muted-foreground">{item.weaponFamily ?? "—"}</td>
      <td className="px-3 py-2 text-muted-foreground">
        {item.damageDice ?? "—"}
        {item.isTwoHanded && <span className="ml-1 text-[10px] text-amber-600">2H</span>}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{item.referencePrice}</td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-2">
          <button onClick={onEdit} className="text-xs text-muted-foreground hover:text-foreground">Изменить</button>
          <button onClick={onCopy} className="text-xs text-blue-600 hover:text-blue-800">Модифицированный</button>
          <button onClick={toggle} disabled={isPending}
            className={cn("text-xs disabled:opacity-50", isDeleted ? "text-green-600" : "text-destructive")}>
            {isDeleted ? "Восстановить" : "Удалить"}
          </button>
        </div>
      </td>
    </tr>
  );
}
