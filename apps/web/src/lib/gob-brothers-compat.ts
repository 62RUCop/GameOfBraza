import { z } from "zod";
import { computeDerived } from "@gob/rules";
import type { RuleConfig } from "@gob/rules";
import type { FullCharacter } from "@/components/character-sheet/character-sheet";

// ─── Shared schema ────────────────────────────────────────────────────────────

export interface GoBItem {
  name: string;
  desc: string;
}

export interface GoBSpell {
  id: string;
  name: string;
  desc: string;
  spec: "damage" | "buff" | "heal" | "debuff";
  level: number;
  mana: number;
  icon: string;
  iconImage?: string;
}

export interface GoBCharacter {
  schemaVersion: 1;
  source: "GameOfBraza";
  name: string;
  description: string;
  lore: string;
  stats: { str: number; dex: number; int: number; spi: number; end: number; luck: number };
  combat: { hp: number; hpBonus: number; ap: number; apBonus: number; mp: number; mpBonus: number };
  equipment: {
    helmet: GoBItem;
    leftHand: GoBItem;
    armor: GoBItem;
    rightHand: GoBItem;
    boots: GoBItem;
    ring: GoBItem;
    necklace: GoBItem;
    bracers: GoBItem;
    pet: GoBItem;
  };
  backpack: GoBItem[];
  spells: GoBSpell[];
}

// ─── Location mapping ─────────────────────────────────────────────────────────

const LOCATION_TO_SLOT: Record<string, keyof GoBCharacter["equipment"]> = {
  equipped_head: "helmet",
  equipped_weapon_left: "leftHand",
  equipped_body: "armor",
  equipped_weapon_right: "rightHand",
  equipped_legs: "boots",
  equipped_ring: "ring",
  equipped_amulet: "necklace",
  equipped_vambraces: "bracers",
  equipped_pet: "pet",
};

export const SLOT_TO_LOCATION: Record<keyof GoBCharacter["equipment"], string> = {
  helmet: "equipped_head",
  leftHand: "equipped_weapon_left",
  armor: "equipped_body",
  rightHand: "equipped_weapon_right",
  boots: "equipped_legs",
  ring: "equipped_ring",
  necklace: "equipped_amulet",
  bracers: "equipped_vambraces",
  pet: "equipped_pet",
};

const EMPTY_ITEM: GoBItem = { name: "", desc: "" };

// ─── Export: GoBraza → GameOfBrothers ────────────────────────────────────────

function getInstName(inst: FullCharacter["equipmentSlots"][0]): string {
  const ov = inst.overrides as Record<string, unknown> | null;
  return (ov?.customName as string | undefined) ?? inst.template?.name ?? "";
}

function getInstDesc(inst: FullCharacter["equipmentSlots"][0]): string {
  const ov = inst.overrides as Record<string, unknown> | null;
  return (ov?.description as string | undefined) ?? "";
}

export function exportToGoBrothers(character: FullCharacter, ruleConfig: RuleConfig): GoBCharacter {
  const attrs = character.attributes;
  const rt = character.runtimeState;

  const str = attrs?.strength ?? 3;
  const dex = attrs?.dexterity ?? 3;
  const int = attrs?.intelligence ?? 3;
  const spi = attrs?.spirit ?? 3;
  const end = attrs?.endurance ?? 3;
  const luc = attrs?.luck ?? 3;

  const derived = computeDerived({ str, dex, int, spi, end, luc }, { hp: 0, mana: 0, ap: 0 }, ruleConfig);

  const effectiveHpMax = rt?.hpMaxManualOverride ? (rt.hpMaxOverride ?? derived.hpMax) : derived.hpMax;
  const effectiveManaMax = rt?.manaMaxManualOverride ? (rt.manaMaxOverride ?? derived.manaMax) : derived.manaMax;
  const effectiveApMax = rt?.apMaxManualOverride ? (rt.apMaxOverride ?? derived.apMax) : derived.apMax;

  const racePart = character.raceName ?? character.race?.name ?? null;
  const groupPart = character.groupName ?? character.group?.name ?? null;
  const descParts: string[] = [];
  if (racePart) descParts.push(`Раса: ${racePart}`);
  if (groupPart) descParts.push(`Группировка: ${groupPart}`);

  const eqByLocation = new Map(character.equipmentSlots.map((i) => [i.location as string, i]));

  const equipment = Object.fromEntries(
    Object.keys(LOCATION_TO_SLOT).map((loc) => {
      const slot = LOCATION_TO_SLOT[loc];
      const inst = eqByLocation.get(loc);
      return [slot, inst ? { name: getInstName(inst), desc: getInstDesc(inst) } : { ...EMPTY_ITEM }];
    }),
  ) as GoBCharacter["equipment"];

  const backpack: GoBItem[] = character.backpackSlots.slice(0, 6).map((slot) => ({
    name: slot.itemName,
    desc: [slot.description, slot.quantity > 1 ? `×${slot.quantity.toString()}` : ""]
      .filter(Boolean)
      .join(" "),
  }));

  const backpackInstances = character.equipmentSlots.filter((i) => i.location === "backpack");
  for (const inst of backpackInstances) {
    if (backpack.length >= 6) break;
    backpack.push({ name: getInstName(inst), desc: getInstDesc(inst) });
  }
  while (backpack.length < 6) backpack.push({ ...EMPTY_ITEM });

  const spells: GoBSpell[] = character.characterSkills.map((cs) => ({
    id: cs.id,
    name: cs.skill.name,
    desc: cs.skill.description ?? "",
    spec: "buff" as const,
    level: 1,
    mana: 0,
    icon: "default",
  }));

  return {
    schemaVersion: 1,
    source: "GameOfBraza",
    name: character.name,
    description: descParts.join(" | "),
    lore: character.quenta ?? "",
    stats: { str, dex, int, spi, end, luck: luc },
    combat: {
      hp: rt?.currentHp ?? derived.hpMax,
      hpBonus: effectiveHpMax - str * ruleConfig.hpPerStr,
      ap: rt?.currentAp ?? derived.apMax,
      apBonus: effectiveApMax - end * ruleConfig.apPerEnd,
      mp: rt?.currentMana ?? derived.manaMax,
      mpBonus: effectiveManaMax - spi * ruleConfig.manaPerSpi,
    },
    equipment,
    backpack,
    spells,
  };
}

// ─── Import: GameOfBrothers → GoBraza ────────────────────────────────────────

const GoBItemSchema = z.object({
  name: z.string().default(""),
  desc: z.string().default(""),
});

const GoBSpellSchema = z.object({
  id: z.string().default(""),
  name: z.string().default(""),
  desc: z.string().default(""),
  spec: z.enum(["damage", "buff", "heal", "debuff"]).default("buff"),
  level: z.number().default(1),
  mana: z.number().default(0),
  icon: z.string().default("default"),
});

const GoBImportSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  lore: z.string().optional(),
  stats: z
    .object({
      str: z.number().default(3),
      dex: z.number().default(3),
      int: z.number().default(3),
      spi: z.number().default(3),
      end: z.number().default(3),
      luck: z.number().default(3),
    })
    .optional(),
  combat: z
    .object({
      hp: z.number().default(0),
      mp: z.number().default(0),
      ap: z.number().default(0),
      hpBonus: z.number().default(0),
      mpBonus: z.number().default(0),
      apBonus: z.number().default(0),
    })
    .optional(),
  equipment: z
    .object({
      helmet: GoBItemSchema.optional(),
      leftHand: GoBItemSchema.optional(),
      armor: GoBItemSchema.optional(),
      rightHand: GoBItemSchema.optional(),
      boots: GoBItemSchema.optional(),
      ring: GoBItemSchema.optional(),
      necklace: GoBItemSchema.optional(),
      bracers: GoBItemSchema.optional(),
      pet: GoBItemSchema.optional(),
    })
    .optional(),
  backpack: z.array(GoBItemSchema).optional(),
  spells: z.array(GoBSpellSchema).optional(),
});

export interface ImportData {
  name: string;
  raceName: string | null;
  groupName: string | null;
  quenta: string | null;
  playerNotes: string | null;
  stats: { str: number; dex: number; int: number; spi: number; end: number; luc: number };
  currentHp: number;
  currentMana: number;
  currentAp: number;
  hpBonus: number;
  manaBonus: number;
  apBonus: number;
  equipment: { location: string; name: string; desc: string }[];
  backpack: { slotIndex: number; name: string; desc: string }[];
}

export function parseGoBImport(json: string): ImportData {
  const parsed = GoBImportSchema.parse(JSON.parse(json) as unknown);

  // Parse race/group from description
  let raceName: string | null = null;
  let groupName: string | null = null;
  const desc = parsed.description ?? "";
  const raceMatch = /Раса:\s*([^|]+)/.exec(desc);
  if (raceMatch?.[1]) raceName = raceMatch[1].trim();
  const groupMatch = /Группировка:\s*([^|]+)/.exec(desc);
  if (groupMatch?.[1]) groupName = groupMatch[1].trim();

  // Collect unresolvable data → playerNotes
  const noteParts: string[] = [];
  if (desc && !raceName && !groupName && desc.trim()) {
    noteParts.push(`Описание (импорт): ${desc.trim()}`);
  }

  const spells = parsed.spells ?? [];
  if (spells.length > 0) {
    const lines = spells.map(
      (s) =>
        `- ${s.name}${s.desc ? `: ${s.desc}` : ""} (${s.spec}, ур.${String(s.level)}, мана: ${String(s.mana)})`,
    );
    noteParts.push(`Скиллы из GameOfBrothers:\n${lines.join("\n")}`);
  }

  const rawStats = parsed.stats;
  const stats = {
    str: rawStats?.str ?? 3,
    dex: rawStats?.dex ?? 3,
    int: rawStats?.int ?? 3,
    spi: rawStats?.spi ?? 3,
    end: rawStats?.end ?? 3,
    luc: rawStats?.luck ?? 3,
  };

  const rawEq = parsed.equipment ?? {};
  const equipment: ImportData["equipment"] = [];
  for (const [slot, loc] of Object.entries(SLOT_TO_LOCATION)) {
    const item = rawEq[slot as keyof typeof rawEq];
    if (item?.name.trim()) {
      equipment.push({ location: loc, name: item.name.trim(), desc: item.desc.trim() });
    }
  }

  const backpack: ImportData["backpack"] = (parsed.backpack ?? [])
    .slice(0, 6)
    .map((item, idx) => ({ slotIndex: idx, name: item.name.trim(), desc: item.desc.trim() }))
    .filter((item) => item.name);

  const combat = parsed.combat;

  return {
    name: parsed.name?.trim() || "Импортированный персонаж",
    raceName,
    groupName,
    quenta: parsed.lore?.trim() || null,
    playerNotes: noteParts.length > 0 ? noteParts.join("\n\n") : null,
    stats,
    currentHp: combat?.hp ?? 0,
    currentMana: combat?.mp ?? 0,
    currentAp: combat?.ap ?? 0,
    hpBonus: combat?.hpBonus ?? 0,
    manaBonus: combat?.mpBonus ?? 0,
    apBonus: combat?.apBonus ?? 0,
    equipment,
    backpack,
  };
}
