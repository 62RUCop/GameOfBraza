"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@gob/ui";
import type {
  Character, CharacterAttributes, Currency, Group, InnateAbility, Pet, Race, RuntimeState, Role,
  BackpackSlot, CharacterSkill, ItemInstance, Reputation, Skill, ItemTemplate, SkillCategory,
} from "@gob/db";

export type SerializedGroup = Omit<Group, "modifierValue"> & { modifierValue: number | null };
import { TabDescription } from "./tab-description";
import { TabAttributes } from "./tab-attributes";
import { TabEquipment } from "./tab-equipment";
import { TabSkills } from "./tab-skills";
import { TabBackpack } from "./tab-backpack";
import { TabReputation } from "./tab-reputation";
import { TabNotes } from "./tab-notes";

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
}

export function CharacterSheet({ character, activeTab, viewerRole, viewerId }: Props) {
  const pathname = usePathname();
  const isOwner = character.ownerId === viewerId;
  const canEdit = isOwner || viewerRole === "gm" || viewerRole === "admin";

  function tabHref(key: TabKey) {
    return `${pathname}?tab=${key}`;
  }

  function renderTab() {
    switch (activeTab as TabKey) {
      case "description":
        return <TabDescription character={character} canEdit={canEdit} />;
      case "attributes":
        return <TabAttributes character={character} canEdit={canEdit} viewerRole={viewerRole} />;
      case "equipment":
        return <TabEquipment character={character} canEdit={canEdit} />;
      case "skills":
        return <TabSkills character={character} canEdit={canEdit} />;
      case "backpack":
        return <TabBackpack character={character} canEdit={canEdit} />;
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
            {character.race?.name ?? "Раса не указана"}
            {character.isNpc && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">NPC</span>}
          </p>
        </div>
        <Link href="/characters" className="text-sm text-muted-foreground hover:text-foreground">
          ← Назад
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
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
      <div>{renderTab()}</div>
    </div>
  );
}
