"use client";

import { useState, useTransition } from "react";
import { cn } from "@gob/ui";
import { attributePowerTier, computeDerived } from "@gob/rules";
import type { RuleConfig } from "@gob/rules";
import type { FullCharacter, FullCharacterSkill } from "./character-sheet";
import { removeCharacterSkill, useSkill } from "@/actions/characters";
import { SkillPickerDialog } from "./skill-picker-dialog";

const SLOTS_PER_SPREAD = 6;

interface Props {
  character: FullCharacter;
  canEdit: boolean;
  ruleConfig: RuleConfig;
}

export function TabSkills({ character, canEdit, ruleConfig }: Props) {
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [editingSkill, setEditingSkill] = useState<FullCharacterSkill | null>(null);
  const [innatePickerOpen, setInnatePickerOpen] = useState(false);
  const [editingInnate, setEditingInnate] = useState(false);
  const [spread, setSpread] = useState(0);
  const [removePending, startRemove] = useTransition();
  const [usePending, startUse] = useTransition();

  const attrs = character.attributes;
  const intValue = attrs?.intelligence ?? 0;
  const intTier = attributePowerTier(intValue);

  // Максимум ячеек способностей — та же величина, что и на вкладке характеристик:
  // расчёт по формуле (@gob/rules: slots = INT) либо ручной оверрайд из RuntimeState.
  const rt = character.runtimeState;
  const computedSlots = computeDerived(
    {
      str: attrs?.strength ?? 0,
      dex: attrs?.dexterity ?? 0,
      int: intValue,
      spi: attrs?.spirit ?? 0,
      end: attrs?.endurance ?? 0,
      luc: attrs?.luck ?? 0,
    },
    {},
    ruleConfig,
  ).slots;
  const effectiveSlots =
    rt?.slotsManualOverride && rt.slotsOverride != null ? rt.slotsOverride : computedSlots;
  const maxSlots = Math.max(effectiveSlots, 1);

  const innateSkill = character.characterSkills.find((cs) => cs.skill.skillType === "innate") ?? null;
  const slotSkills = character.characterSkills.filter(
    (cs) => cs.skill.occupiesSlot && cs.skill.skillType !== "innate",
  );

  const totalSpreads = Math.max(1, Math.ceil(maxSlots / SLOTS_PER_SPREAD));
  const spreadStart = spread * SLOTS_PER_SPREAD;

  const slots: (FullCharacterSkill | null)[] = Array.from(
    { length: maxSlots },
    (_, i) => slotSkills[i] ?? null,
  );

  const currentSix = Array.from({ length: SLOTS_PER_SPREAD }, (_, i) => slots[spreadStart + i] ?? null);
  const leftSlots = currentSix.slice(0, 3);
  const rightSlots = currentSix.slice(3, 6);

  const currentMana = rt?.currentMana ?? 0;
  const manaMax = rt?.manaMaxComputed ?? 0;
  const currentAp = rt?.currentAp ?? 0;
  const apMax = rt?.apMaxComputed ?? 0;

  const usedSlots = slotSkills.length;
  const overSlots = usedSlots > maxSlots;

  const allSkillIds = character.characterSkills.map((cs) => cs.skillId);

  function handleRemove(cs: FullCharacterSkill) {
    startRemove(async () => {
      await removeCharacterSkill({ characterId: character.id, characterSkillId: cs.id });
    });
  }

  function handleUse(manaCost: number, apCost: number) {
    startUse(async () => {
      await useSkill({ characterId: character.id, manaCost, apCost });
    });
  }

  return (
    <div className="space-y-4">
      {/* Slot counter */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Ячейки способностей:</span>
        <span className={cn("font-semibold tabular-nums", overSlots && "text-amber-600")}>
          {usedSlots} / {maxSlots}
        </span>
        {overSlots && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            превышено
          </span>
        )}
      </div>

      {/* ══════════════════ КНИГА ══════════════════ */}
      <div className="relative mx-auto max-w-[620px] select-none">
        {/* Кожаная обложка */}
        <div
          className="rounded-xl p-[6px] shadow-lg bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200 dark:from-zinc-800 dark:via-zinc-850 dark:to-zinc-900"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)" }}
        >
          {/* Серебристые уголки */}
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-zinc-400/50 rounded-tl" />
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-zinc-400/50 rounded-tr" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-zinc-400/50 rounded-bl" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-zinc-400/50 rounded-br" />

          {/* Разворот книги */}
          <div className="flex rounded-lg overflow-hidden">
            {/* Левая страница */}
            <div className="flex-1 p-3 space-y-2 bg-gradient-to-r from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
              <PageCornerDecor side="left" />
              {leftSlots.map((cs, i) => (
                <SkillBookSlot
                  key={i}
                  slotIndex={spreadStart + i}
                  cs={cs}
                  intTier={intTier}
                  canEdit={canEdit && !removePending}
                  usePending={usePending}
                  onOpen={() => { setPickerSlot(spreadStart + i); }}
                  onRemove={cs ? () => { handleRemove(cs); } : undefined}
                  onEdit={cs ? () => { setEditingSkill(cs); } : undefined}
                  onUse={handleUse}
                />
              ))}
            </div>

            {/* Корешок */}
            <div
              className="w-5 shrink-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-300 dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700"
              style={{ boxShadow: "inset 2px 0 6px rgba(0,0,0,0.10), inset -2px 0 6px rgba(0,0,0,0.10)" }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-zinc-400/60 dark:bg-zinc-500/60" />
              ))}
            </div>

            {/* Правая страница */}
            <div className="flex-1 p-3 space-y-2 bg-gradient-to-l from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
              <PageCornerDecor side="right" />
              {rightSlots.map((cs, i) => (
                <SkillBookSlot
                  key={i}
                  slotIndex={spreadStart + 3 + i}
                  cs={cs}
                  intTier={intTier}
                  canEdit={canEdit && !removePending}
                  usePending={usePending}
                  onOpen={() => { setPickerSlot(spreadStart + 3 + i); }}
                  onRemove={cs ? () => { handleRemove(cs); } : undefined}
                  onEdit={cs ? () => { setEditingSkill(cs); } : undefined}
                  onUse={handleUse}
                />
              ))}
            </div>

            {/* Закладки */}
            <div className="flex flex-col gap-1 px-1 py-2 shrink-0 bg-zinc-200 dark:bg-zinc-800">
              {Array.from({ length: Math.min(totalSpreads, 8) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setSpread(i); }}
                  title={`Страница ${String(i * SLOTS_PER_SPREAD + 1)}–${String(Math.min((i + 1) * SLOTS_PER_SPREAD, maxSlots))}`}
                  className={cn(
                    "w-4 rounded-r transition-all",
                    i === spread
                      ? "h-8 bg-amber-200 dark:bg-amber-800"
                      : "h-6 opacity-70 hover:opacity-100 bg-zinc-400 dark:bg-zinc-600",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Нижняя полоса: мана + ОД + навигация */}
          <div className="mt-[3px] rounded-b-lg flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-750 dark:to-zinc-800">
            <button
              onClick={() => { setSpread((s) => Math.max(0, s - 1)); }}
              disabled={spread === 0}
              className="text-zinc-700/80 hover:text-zinc-900 dark:text-zinc-300/80 dark:hover:text-zinc-100 disabled:opacity-20 text-xl leading-none font-bold transition-colors"
              aria-label="Предыдущие ячейки"
            >
              ‹
            </button>

            <div
              className="flex items-center gap-4 text-zinc-700 dark:text-zinc-300 text-sm font-semibold tracking-wide"
              style={{ fontFamily: "Georgia, serif" }}
            >
              <span>💧 {currentMana} / {manaMax}</span>
              <span className="text-zinc-400/60">·</span>
              <span>⚡ {currentAp} / {apMax}</span>
            </div>

            <button
              onClick={() => { setSpread((s) => Math.min(totalSpreads - 1, s + 1)); }}
              disabled={spread >= totalSpreads - 1}
              className="text-zinc-700/80 hover:text-zinc-900 dark:text-zinc-300/80 dark:hover:text-zinc-100 disabled:opacity-20 text-xl leading-none font-bold transition-colors"
              aria-label="Следующие ячейки"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Врождённая способность */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Врождённая способность
        </h3>
        <InnateSlot
          cs={innateSkill}
          intTier={intTier}
          canEdit={canEdit && !removePending}
          usePending={usePending}
          onOpen={() => { setInnatePickerOpen(true); }}
          onRemove={innateSkill ? () => { handleRemove(innateSkill); } : undefined}
          onEdit={innateSkill ? () => { setEditingInnate(true); } : undefined}
          onUse={handleUse}
        />
      </div>

      {/* Диалог выбора скилла */}
      {pickerSlot !== null && (
        <SkillPickerDialog
          characterId={character.id}
          slotIndex={pickerSlot}
          currentSkillId={slots[pickerSlot]?.skillId ?? null}
          existingSkillIds={allSkillIds}
          filterType="acquired"
          onClose={() => { setPickerSlot(null); }}
        />
      )}
      {innatePickerOpen && (
        <SkillPickerDialog
          characterId={character.id}
          slotIndex={0}
          currentSkillId={innateSkill?.skillId ?? null}
          existingSkillIds={allSkillIds}
          filterType="innate"
          onClose={() => { setInnatePickerOpen(false); }}
        />
      )}
      {/* Диалог редактирования скилла из книги */}
      {editingSkill && (
        <SkillPickerDialog
          characterId={character.id}
          slotIndex={0}
          currentSkillId={editingSkill.skillId}
          existingSkillIds={allSkillIds}
          filterType="acquired"
          editingSkill={editingSkill.skill}
          onClose={() => { setEditingSkill(null); }}
        />
      )}
      {/* Диалог редактирования врождённого скилла */}
      {editingInnate && innateSkill && (
        <SkillPickerDialog
          characterId={character.id}
          slotIndex={0}
          currentSkillId={innateSkill.skillId}
          existingSkillIds={allSkillIds}
          filterType="innate"
          editingSkill={innateSkill.skill}
          onClose={() => { setEditingInnate(false); }}
        />
      )}
    </div>
  );
}

// ─── Ячейка скилла в книге ────────────────────────────────────────────────────

function SkillBookSlot({
  slotIndex,
  cs,
  intTier,
  canEdit,
  usePending,
  onOpen,
  onRemove,
  onEdit,
  onUse,
}: {
  slotIndex: number;
  cs: FullCharacterSkill | null;
  intTier: number;
  canEdit: boolean;
  usePending: boolean;
  onOpen: () => void;
  onRemove?: (() => void) | undefined;
  onEdit?: (() => void) | undefined;
  onUse: (manaCost: number, apCost: number) => void;
}) {
  const skill = cs?.skill ?? null;
  const blocked = skill ? intTier < skill.tier : false;
  const hasCost = skill && (skill.manaCost != null || skill.apCost != null);

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-300/50 bg-white/50 dark:border-zinc-600/50 dark:bg-zinc-800/50 px-2 py-1.5 transition-all",
        blocked && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Иконка */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={onOpen}
          aria-label={skill ? skill.name : `Ячейка ${String(slotIndex + 1)}`}
          className={cn(
            "shrink-0 w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all mt-0.5",
            skill ? tierBorderClass(skill.tier) : "border-zinc-300/50 dark:border-zinc-600/50",
            skill ? tierBgClass(skill.tier) : "bg-zinc-200/30 dark:bg-zinc-700/30",
            canEdit && "hover:scale-105 cursor-pointer",
            !canEdit && "cursor-default",
          )}
        >
          {skill?.icon ? (
            <img src={skill.icon} alt={skill.name} className="w-full h-full object-cover" />
          ) : skill ? (
            <span className="text-white/90 text-base">✦</span>
          ) : (
            <span className="text-zinc-400/60 text-base select-none">✦</span>
          )}
        </button>

        {/* Контент */}
        <div className="flex-1 min-w-0">
          {skill ? (
            <>
              {/* Заголовок + кнопки */}
              <div className="flex items-start justify-between gap-1">
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    blocked ? "text-zinc-500/70 italic" : "text-zinc-800 dark:text-zinc-200",
                  )}
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {skill.name}
                </p>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        title="Редактировать скилл"
                        className="text-zinc-400/60 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-xs leading-none"
                      >
                        ✎
                      </button>
                    )}
                    {onRemove && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        title="Убрать скилл"
                        className="text-zinc-400/60 hover:text-red-600 dark:hover:text-red-400 transition-colors text-xs leading-none"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Стоимость */}
              <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {skill.manaCost != null && <span>💧 {skill.manaCost}</span>}
                {skill.apCost != null && <span>⚡ {skill.apCost} ОД</span>}
                {blocked && <span className="text-amber-700 dark:text-amber-500">🔒 тир {skill.tier}</span>}
                {skill.authorName && <span className="text-zinc-400/70 dark:text-zinc-500/70">✍ {skill.authorName}</span>}
              </div>

              {/* Описание */}
              {skill.description && (
                <p className="mt-1 text-[10px] leading-tight text-zinc-500/70 dark:text-zinc-400/70 line-clamp-2">
                  {skill.description}
                </p>
              )}

              {/* Кнопка использовать */}
              {hasCost && (
                <button
                  type="button"
                  disabled={usePending}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUse(skill.manaCost ?? 0, skill.apCost ?? 0);
                  }}
                  className={cn(
                    "mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold transition-all",
                    "bg-blue-500/15 border border-blue-400/40 text-blue-700 dark:text-blue-400",
                    "hover:bg-blue-500/25 hover:border-blue-400/70 active:scale-95",
                    usePending && "opacity-40 pointer-events-none",
                  )}
                >
                  Использовать
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={!canEdit}
              onClick={onOpen}
              className={cn(
                "text-xs italic transition-colors mt-2.5",
                canEdit
                  ? "text-zinc-500/50 hover:text-zinc-600/80 dark:text-zinc-400/50 dark:hover:text-zinc-300/80 cursor-pointer"
                  : "text-zinc-400/40 cursor-default",
              )}
            >
              {canEdit ? "нажмите, чтобы добавить" : "пусто"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Слот врождённой способности ─────────────────────────────────────────────

function InnateSlot({
  cs,
  intTier,
  canEdit,
  usePending,
  onOpen,
  onRemove,
  onEdit,
  onUse,
}: {
  cs: FullCharacterSkill | null;
  intTier: number;
  canEdit: boolean;
  usePending: boolean;
  onOpen: () => void;
  onRemove?: (() => void) | undefined;
  onEdit?: (() => void) | undefined;
  onUse: (manaCost: number, apCost: number) => void;
}) {
  const skill = cs?.skill ?? null;
  const blocked = skill ? intTier < skill.tier : false;
  const hasCost = skill && (skill.manaCost != null || skill.apCost != null);

  return (
    <div
      className={cn(
        "rounded-lg border border-purple-300/50 bg-purple-50/30 dark:bg-purple-950/20 px-3 py-2.5 transition-all",
        blocked && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={!canEdit}
          onClick={onOpen}
          aria-label={skill ? skill.name : "Врождённая способность"}
          className={cn(
            "shrink-0 w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all mt-0.5",
            skill ? tierBorderClass(skill.tier) : "border-purple-300/50",
            skill ? tierBgClass(skill.tier) : "bg-purple-100/40 dark:bg-purple-900/20",
            canEdit && "hover:scale-105 cursor-pointer",
            !canEdit && "cursor-default",
          )}
        >
          {skill?.icon ? (
            <img src={skill.icon} alt={skill.name} className="w-full h-full object-cover" />
          ) : skill ? (
            <span className="text-white/90 text-base">✦</span>
          ) : (
            <span className="text-purple-400/50 text-base select-none">✦</span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {skill ? (
            <>
              <div className="flex items-start justify-between gap-1">
                <p className={cn("text-sm font-semibold leading-tight", blocked && "opacity-50 italic")}>
                  {skill.name}
                </p>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        title="Редактировать способность"
                        className="text-muted-foreground/40 hover:text-blue-500 transition-colors text-xs leading-none"
                      >
                        ✎
                      </button>
                    )}
                    {onRemove && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        title="Убрать способность"
                        className="text-muted-foreground/40 hover:text-destructive transition-colors text-xs leading-none"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-[10px] text-muted-foreground">
                {skill.manaCost != null && <span>💧 {skill.manaCost}</span>}
                {skill.apCost != null && <span>⚡ {skill.apCost} ОД</span>}
                {blocked && <span className="text-amber-600">🔒 тир {skill.tier}</span>}
                {skill.authorName && <span className="text-muted-foreground/60">✍ {skill.authorName}</span>}
              </div>
              {skill.description && (
                <p className="mt-1 text-[10px] leading-tight text-muted-foreground/70 line-clamp-2">
                  {skill.description}
                </p>
              )}
              {hasCost && (
                <button
                  type="button"
                  disabled={usePending}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUse(skill.manaCost ?? 0, skill.apCost ?? 0);
                  }}
                  className={cn(
                    "mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold transition-all",
                    "bg-primary/10 border border-primary/30 text-primary",
                    "hover:bg-primary/20 hover:border-primary/50 active:scale-95",
                    usePending && "opacity-40 pointer-events-none",
                  )}
                >
                  Использовать
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={!canEdit}
              onClick={onOpen}
              className={cn(
                "text-xs italic transition-colors mt-2.5",
                canEdit ? "text-purple-400 hover:text-purple-600 cursor-pointer" : "text-muted-foreground/25 cursor-default",
              )}
            >
              {canEdit ? "нажмите, чтобы добавить" : "пусто"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Декоративный уголок страницы ─────────────────────────────────────────────

function PageCornerDecor({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "absolute top-3 pointer-events-none w-3 h-3",
        side === "left"
          ? "left-3 border-t border-l border-zinc-400/40 rounded-tl"
          : "right-3 border-t border-r border-zinc-400/40 rounded-tr",
      )}
    />
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

