"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@gob/ui";
import { deleteCharacter } from "@/actions/characters";
import type {
  Character, CharacterAttributes, Currency, Group, InnateAbility, Pet, Race, RuntimeState, Role,
  BackpackSlot, CharacterSkill, ItemInstance, Reputation, Skill, ItemTemplate, SkillCategory,
} from "@gob/db";
import type { RuleConfig } from "@gob/rules";

export type SerializedGroup = Omit<Group, "modifierValue"> & { modifierValue: number | null };
import { TabDescription } from "./tab-description";
import { TabAttributes } from "./tab-attributes";
import { TabEquipment } from "./tab-equipment";
import { TabSkills } from "./tab-skills";
import { TabBackpack } from "./tab-backpack";
import { TabReputation } from "./tab-reputation";
import { TabNotes } from "./tab-notes";
import { useSheetLayout } from "../use-sheet-layout";

export type FullCharacterSkill = CharacterSkill & {
  skill: Skill;
  character: { characterSkillTags: { skillId: string; categoryId: string; category: SkillCategory; characterId: string }[] };
};

export type SerializedItemTemplate = Omit<ItemTemplate, "referencePrice" | "scalingCoefficient"> & {
  referencePrice: number;
  scalingCoefficient: number | null;
};

export type FullItemInstance = Omit<ItemInstance, "acquiredPrice"> & {
  acquiredPrice: number | null;
  template: SerializedItemTemplate | null;
};

export type FullReputation = Reputation & { race: Race };

export type FullPet = Pet & { ability: Skill | null };

export type SerializedCurrency = Omit<Currency, "balanceBronze"> & { balanceBronze: number };

export type FullCharacter = Character & {
  race: Race | null;
  group: SerializedGroup | null;
  attributes: CharacterAttributes | null;
  runtimeState: RuntimeState | null;
  currency: SerializedCurrency | null;
  pet: FullPet | null;
  innateAbility: InnateAbility | null;
  equipmentSlots: FullItemInstance[];
  characterSkills: FullCharacterSkill[];
  backpackSlots: BackpackSlot[];
  reputations: FullReputation[];
};

const TABS = [
  { key: "description", label: "Описание" },
  { key: "attributes",  label: "Характеристики" },
  { key: "equipment",   label: "Снаряжение" },
  { key: "skills",      label: "Скиллы" },
  { key: "backpack",    label: "Рюкзак" },
  { key: "reputation",  label: "Репутация" },
  { key: "notes",       label: "Заметки" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  character: FullCharacter;
  activeTab: string;
  viewerRole: Role;
  viewerId: string;
  ruleConfig: RuleConfig;
}

export function CharacterSheet({ character, activeTab, viewerRole, viewerId, ruleConfig }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isOwner = character.ownerId === viewerId;
  const canEdit = isOwner || viewerRole === "gm" || viewerRole === "admin";
  const canDelete = isOwner || viewerRole === "gm" || viewerRole === "admin";

  const layout = useSheetLayout();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCharacter(character.id);
      if (result.error) {
        setDeleteError(result.error);
        setConfirmDelete(false);
      } else {
        router.push("/characters");
      }
    });
  }

  function tabHref(key: TabKey) {
    return `${pathname}?tab=${key}`;
  }

  function renderTabContent(key: TabKey) {
    switch (key) {
      case "description":
        return <TabDescription character={character} canEdit={canEdit} />;
      case "attributes":
        return <TabAttributes character={character} canEdit={canEdit} viewerRole={viewerRole} ruleConfig={ruleConfig} />;
      case "equipment":
        return <TabEquipment character={character} canEdit={canEdit} />;
      case "skills":
        return <TabSkills character={character} canEdit={canEdit} ruleConfig={ruleConfig} />;
      case "backpack":
        return <TabBackpack character={character} canEdit={canEdit} ruleConfig={ruleConfig} />;
      case "reputation":
        return <TabReputation character={character} canEdit={canEdit} />;
      case "notes":
        return <TabNotes character={character} canEdit={canEdit} />;
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{character.name}</h1>
          <p className="text-sm text-muted-foreground">
            {character.raceName ?? character.race?.name ?? "Раса не указана"}
            {character.isNpc && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">NPC</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canDelete && (
            <button
              onClick={() => { setConfirmDelete(true); setDeleteError(null); }}
              className="text-sm text-destructive hover:text-destructive/80"
            >
              Удалить
            </button>
          )}
          <Link href="/characters" className="text-sm text-muted-foreground hover:text-foreground">
            ← Назад
          </Link>
        </div>
      </div>

      {layout === "continuous" ? (
        /* Сплошной режим: все разделы на одном экране */
        <div className="space-y-8">
          {TABS.map((tab) => (
            <section key={tab.key} className="space-y-4">
              <h2 className="border-b pb-2 text-lg font-semibold">{tab.label}</h2>
              {renderTabContent(tab.key)}
            </section>
          ))}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b">
            <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-hide">
              {TABS.map((tab) => (
                <Link
                  key={tab.key}
                  href={tabHref(tab.key)}
                  className={cn(
                    "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                    activeTab === tab.key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div>{renderTabContent(activeTab as TabKey)}</div>
        </>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Удалить персонажа?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              «{character.name}» будет удалён. Это действие нельзя отменить.
            </p>
            {deleteError && (
              <p className="mt-2 text-sm text-destructive">{deleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDelete(false); }}
                disabled={isPending}
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isPending ? "Удаляем…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
