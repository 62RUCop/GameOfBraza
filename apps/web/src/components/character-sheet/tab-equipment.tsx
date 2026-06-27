"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { cn } from "@gob/ui";
import { unequipItem } from "@/actions/characters";
import { EquipmentPickerDialog, type EditingItemInput } from "./equipment-picker-dialog";
import type { FullCharacter, FullItemInstance } from "./character-sheet";

interface Props {
  character: FullCharacter;
  canEdit: boolean;
}

const SLOT_LABELS: Record<string, string> = {
  equipped_head:         "Голова",
  equipped_body:         "Тело",
  equipped_legs:         "Ноги",
  equipped_vambraces:    "Наручи",
  equipped_weapon_left:  "Оружие (лев.)",
  equipped_weapon_right: "Оружие (прав.)",
  equipped_ring:         "Кольцо",
  equipped_amulet:       "Амулет",
  equipped_pet:          "Питомец",
};

/** Соответствие слота (equipped_X) → SlotType (X) для фильтрации шаблонов. */
const SLOT_TO_SLOT_TYPE: Record<string, string> = {
  equipped_head:         "head",
  equipped_body:         "body",
  equipped_legs:         "legs",
  equipped_vambraces:    "vambraces",
  equipped_weapon_left:  "weapon_left",
  equipped_weapon_right: "weapon_right",
  equipped_ring:         "ring",
  equipped_amulet:       "amulet",
  equipped_pet:          "pet",
};

const SLOT_LAYOUT: Record<string, {
  top: string;
  left?: string;
  right?: string;
  width: string;
  transform?: string;
}> = {
  equipped_head:         { top: "1%",  left: "50%", width: "32%", transform: "translateX(-50%)" },
  equipped_amulet:       { top: "12%", right: "2%", width: "28%" },
  equipped_weapon_left:  { top: "27%", left: "2%",  width: "28%" },
  equipped_body:         { top: "24%", left: "50%", width: "36%", transform: "translateX(-50%)" },
  equipped_weapon_right: { top: "27%", right: "2%", width: "28%" },
  equipped_vambraces:    { top: "48%", left: "2%",  width: "26%" },
  equipped_ring:         { top: "48%", right: "2%", width: "25%" },
  equipped_legs:         { top: "52%", left: "50%", width: "33%", transform: "translateX(-50%)" },
  equipped_pet:          { top: "67%", left: "2%",  width: "27%" },
};

const SLOT_ORDER = Object.keys(SLOT_LAYOUT);

export function TabEquipment({ character, canEdit }: Props) {
  // Открытый диалог: для занятого слота правим текущий предмет (item != null),
  // для пустого — выбираем новый.
  const [dialog, setDialog] = useState<{ slotKey: string; item: FullItemInstance | null } | null>(null);
  const [unequipPending, startUnequip] = useTransition();

  const equipped = new Map<string, FullItemInstance>();
  for (const inst of character.equipmentSlots) {
    if (inst.location !== "backpack") {
      equipped.set(inst.location, inst);
    }
  }

  function handleUnequip(item: FullItemInstance) {
    startUnequip(async () => {
      await unequipItem({ characterId: character.id, itemInstanceId: item.id });
    });
  }

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Экипировка
        </h3>
        {canEdit && (
          <p className="text-xs text-muted-foreground">
            Нажмите на занятый слот, чтобы изменить предмет, на пустой — выбрать; на крестик — снять.
          </p>
        )}

        <div
          className="relative w-full max-w-[420px] mx-auto"
          style={{ aspectRatio: "3/5" }}
        >
          {/* Silhouette */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <Image
              src="/character-silhouette.svg"
              alt=""
              aria-hidden
              fill
              className="object-contain opacity-[0.07] dark:opacity-[0.25] dark:invert"
            />
          </div>

          {/* Slots */}
          {SLOT_ORDER.map((slotKey) => {
            const pos = SLOT_LAYOUT[slotKey];
            if (!pos) return null;
            const item = equipped.get(slotKey) ?? null;
            return (
              <div
                key={slotKey}
                className="absolute"
                style={{
                  top:       pos.top,
                  left:      pos.left,
                  right:     pos.right,
                  width:     pos.width,
                  transform: pos.transform,
                }}
              >
                <SlotCard
                  label={SLOT_LABELS[slotKey] ?? slotKey}
                  item={item}
                  canEdit={canEdit && !unequipPending}
                  onOpen={() => { setDialog({ slotKey, item: null }); }}
                  onEdit={item ? () => { setDialog({ slotKey, item }); } : undefined}
                  onUnequip={item ? () => { handleUnequip(item); } : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Picker / edit dialog */}
      {dialog && (
        <EquipmentPickerDialog
          characterId={character.id}
          slot={dialog.slotKey}
          slotLabel={SLOT_LABELS[dialog.slotKey] ?? dialog.slotKey}
          slotType={SLOT_TO_SLOT_TYPE[dialog.slotKey] ?? dialog.slotKey.replace("equipped_", "")}
          {...(dialog.item ? { editingItem: buildEditingItem(dialog.item) } : {})}
          onClose={() => { setDialog(null); }}
        />
      )}
    </>
  );
}

/** Собирает данные текущего экземпляра для формы редактирования: base — значения
 *  шаблона (для diff в overrides), effective — то, что реально показывается. */
function buildEditingItem(item: FullItemInstance): EditingItemInput {
  const overrides = (item.overrides as Record<string, unknown> | null) ?? {};
  const tmpl = item.template;
  const str = (v: unknown): string =>
    typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

  return {
    id: item.id,
    base: tmpl
      ? {
          name: tmpl.name,
          tier: tmpl.tier,
          weaponFamily: tmpl.weaponFamily,
          damageDice: tmpl.damageDice,
          bonusCritDice: tmpl.bonusCritDice,
          description: tmpl.description,
        }
      : null,
    effective: {
      name: str(overrides.name ?? tmpl?.name),
      // Без дефолта: пустой тир остаётся пустым, чтобы правка не штамповала Т1
      // предметам, у которых тира не было.
      tier: str(overrides.tier ?? tmpl?.tier),
      weaponFamily: str(overrides.weaponFamily ?? tmpl?.weaponFamily),
      damageDice: str(overrides.damageDice ?? tmpl?.damageDice),
      bonusCritDice: str(overrides.bonusCritDice ?? tmpl?.bonusCritDice),
      description: str(overrides.description ?? tmpl?.description),
    },
  };
}

function SlotCard({
  label,
  item,
  canEdit,
  onOpen,
  onEdit,
  onUnequip,
}: {
  label: string;
  item: FullItemInstance | null;
  canEdit: boolean;
  onOpen: () => void;
  onEdit?: (() => void) | undefined;
  onUnequip?: (() => void) | undefined;
}) {
  const overrides = item?.overrides as Record<string, unknown> | null | undefined;
  const tmpl = item?.template;
  const name = (overrides?.name as string | undefined) ?? tmpl?.name;
  const tier = (overrides?.tier as number | undefined) ?? tmpl?.tier;
  const damageDice = (overrides?.damageDice as string | undefined) ?? tmpl?.damageDice;
  const description = (overrides?.description as string | undefined) ?? tmpl?.description;

  return (
    <div className="group relative flex flex-col justify-between rounded-lg border bg-background/80 backdrop-blur-sm p-2 min-h-[58px] shadow-sm">
      {/* Slot label + unequip button */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
          {label}
        </span>
        {canEdit && item && onUnequip && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnequip(); }}
            title="Снять предмет"
            className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors leading-none text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Контент: у занятого слота клик открывает правку текущего предмета,
          у пустого — выбор нового. */}
      <button
        type="button"
        disabled={!canEdit}
        onClick={item && onEdit ? onEdit : onOpen}
        className={cn(
          "mt-1 text-left w-full",
          canEdit && "hover:opacity-80 cursor-pointer",
          !canEdit && "cursor-default",
        )}
      >
        {item ? (
          <div>
            <p className="text-xs font-medium leading-tight break-words">{name ?? "Предмет без шаблона"}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
              {tier !== undefined && <span>Т{tier}</span>}
              {damageDice && <span>{damageDice}</span>}
            </div>
            {description && (
              <p className="mt-0.5 text-[10px] text-muted-foreground/70 break-words">{description}</p>
            )}
          </div>
        ) : (
          <span className={cn(
            "text-xs italic",
            canEdit ? "text-muted-foreground/50 hover:text-muted-foreground" : "text-muted-foreground/30",
          )}>
            {canEdit ? "нажмите, чтобы надеть" : "пусто"}
          </span>
        )}
      </button>
    </div>
  );
}
