/**
 * Pure parsers that turn the permissive Neople gear/avatar/creature JSON blobs
 * (stored as `unknown` in snapshots) into typed, render-ready rows.
 *
 * The API blobs are deeply nested and drift across patches, so every field is
 * read defensively and missing data degrades gracefully rather than throwing.
 */

export interface EnchantStat {
  name: string;
  value: string;
}

export interface EquipmentRow {
  slotId: string;
  slotName: string;
  itemId: string | null;
  itemName: string;
  itemRarity: string;
  itemTypeDetail: string | null;
  /** Reinforcement OR amplification level (the in-game "+N"). */
  reinforce: number;
  /** Non-null when the item is amplified (the "+N" is an amp level, not reinforce). */
  amplificationName: string | null;
  /** Fused item ("[Fusion] …"), from `upgradeInfo`. */
  fusionName: string | null;
  fusionRarity: string | null;
  fusionItemId: string | null;
  /** Headline fusion-option effect, when present. */
  fusionEffect: string | null;
  enchant: EnchantStat[];
}

export interface EquipmentSet {
  /** Display name, e.g. "Paradise of Dazzling Gold Set". */
  name: string;
  /** Set tier label from the API, e.g. "Epic III" (null if absent). */
  rarityName: string | null;
  /** Current set-point total (the headline "(2570)" number); null if absent. */
  setPoint: number | null;
}

export interface ItemIcon {
  itemId: string | null;
  itemName: string;
  itemRarity: string;
  slotName: string | null;
  /** Optional one-line detail (e.g. avatar option ability, artifact color). */
  note?: string | null;
}

/** The buff-skill enhancement readout (dfogang "Buff Enhancement" panel). */
export interface BuffEnhancement {
  /** Buff-skill name, e.g. "Demonic Unleash" (null if absent). */
  skillName: string | null;
  /** Buff-skill level, e.g. 20 (null if absent). */
  level: number | null;
  /** Equipment that contributes to the buff skill. */
  equipment: ItemIcon[];
}

/** One emblem socketed into an avatar. */
export interface AvatarEmblem {
  itemId: string | null;
  itemName: string;
  itemRarity: string;
  /** Emblem socket color, e.g. "Red", "Platinum", "Multicolored". */
  color: string | null;
}

/** A detailed avatar slot for the dfogang "Avatars & Emblems" grid. */
export interface AvatarSlot {
  slotName: string;
  itemId: string | null;
  itemName: string;
  itemRarity: string;
  /** Avatar option ability, e.g. "Strength 55 Increased" (null if absent). */
  optionAbility: string | null;
  /** Cloned (skin) avatar shown over the base, when present. */
  clone: { itemId: string | null; itemName: string } | null;
  emblems: AvatarEmblem[];
}

export interface StatEntry {
  name: string;
  value: string;
}

export interface BuffEntry {
  name: string;
  level: number | null;
  status: StatEntry[];
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

/** Unwrap a snapshot blob to its inner array under `key` (e.g. "equipment", "avatar"). */
function innerArray(blob: unknown, key: string): unknown[] {
  const obj = asRecord(blob);
  if (obj == null) return [];
  const arr = obj[key];
  return Array.isArray(arr) ? arr : [];
}

/** Format one enchant entry: numeric → "+15 All Atk", percent/string → "2% Overall Damage". */
function formatEnchant(name: string, value: unknown): EnchantStat {
  if (typeof value === "number") {
    return { name, value: value >= 0 ? `+${value}` : `${value}` };
  }
  return { name, value: value == null ? "" : String(value) };
}

function parseEnchant(raw: unknown): EnchantStat[] {
  const obj = asRecord(raw);
  if (obj == null) return [];
  const status = obj["status"];
  if (!Array.isArray(status)) return [];
  return status.flatMap((entry) => {
    const e = asRecord(entry);
    const name = e && str(e["name"]);
    if (name == null) return [];
    return [formatEnchant(name, e?.["value"])];
  });
}

function parseFusionEffect(raw: unknown): string | null {
  const obj = asRecord(raw);
  if (obj == null) return null;
  const options = obj["options"];
  if (!Array.isArray(options) || options.length === 0) return null;
  const first = asRecord(options[0]);
  if (first == null) return null;
  return str(first["explain"]) ?? str(first["buffExplain"]);
}

/** Parse the equipment snapshot blob into typed gear rows. */
export function parseEquipment(blob: unknown): EquipmentRow[] {
  return innerArray(blob, "equipment").flatMap((entry) => {
    const e = asRecord(entry);
    if (e == null) return [];
    const upgrade = asRecord(e["upgradeInfo"]);
    return [
      {
        slotId: str(e["slotId"]) ?? "",
        slotName: str(e["slotName"]) ?? "—",
        itemId: str(e["itemId"]),
        itemName: str(e["itemName"]) ?? "Unknown",
        itemRarity: str(e["itemRarity"]) ?? "",
        itemTypeDetail: str(e["itemTypeDetail"]),
        reinforce: num(e["reinforce"]),
        amplificationName: str(e["amplificationName"]),
        fusionName: upgrade ? str(upgrade["itemName"]) : null,
        fusionRarity: upgrade ? str(upgrade["itemRarity"]) : null,
        fusionItemId: upgrade ? str(upgrade["itemId"]) : null,
        fusionEffect: parseFusionEffect(e["fusionOption"]),
        enchant: parseEnchant(e["enchant"]),
      },
    ];
  });
}

/**
 * Parse the equipped armor/accessory set from the equipment snapshot blob.
 *
 * The Neople blob exposes `setItemInfo[]`; each entry carries `setItemName`,
 * `setItemRarityName`, and `active.setPoint.{current,min,max}`. We surface the
 * first (primary) set with its current set-point total for the card headline.
 * Returns null when no set is equipped or the blob is malformed.
 */
export function parseEquipmentSet(blob: unknown): EquipmentSet | null {
  const sets = innerArray(blob, "setItemInfo");
  if (sets.length === 0) return null;
  const s = asRecord(sets[0]);
  if (s == null) return null;
  const name = str(s["setItemName"]);
  if (name == null) return null;
  const active = asRecord(s["active"]);
  const setPoint = active && asRecord(active["setPoint"]);
  const current =
    setPoint && typeof setPoint["current"] === "number"
      ? (setPoint["current"] as number)
      : null;
  return {
    name,
    rarityName: str(s["setItemRarityName"]),
    setPoint: current,
  };
}

/** Parse the avatar snapshot blob into icon rows. */
export function parseAvatars(blob: unknown): ItemIcon[] {
  return innerArray(blob, "avatar").flatMap((entry) => {
    const a = asRecord(entry);
    if (a == null) return [];
    return [
      {
        itemId: str(a["itemId"]),
        itemName: str(a["itemName"]) ?? "Unknown",
        itemRarity: str(a["itemRarity"]) ?? "",
        slotName: str(a["slotName"]),
        note: str(a["optionAbility"]),
      },
    ];
  });
}

/** Collapse the doubled whitespace the Neople API emits in option strings. */
function tidy(s: string | null): string | null {
  return s == null ? null : s.replace(/\s+/g, " ").trim();
}

/**
 * Parse the avatar snapshot blob into detailed slots for the dfogang
 * "Avatars & Emblems" grid: each slot carries its option ability, cloned skin
 * avatar, and socketed emblems. Missing fields degrade gracefully.
 */
export function parseAvatarsDetailed(blob: unknown): AvatarSlot[] {
  return innerArray(blob, "avatar").flatMap((entry) => {
    const a = asRecord(entry);
    if (a == null) return [];

    const cloneRec = asRecord(a["clone"]);
    const cloneName = cloneRec && str(cloneRec["itemName"]);
    const clone = cloneName
      ? { itemId: cloneRec ? str(cloneRec["itemId"]) : null, itemName: cloneName }
      : null;

    const emblemsRaw = Array.isArray(a["emblems"]) ? (a["emblems"] as unknown[]) : [];
    const emblems: AvatarEmblem[] = emblemsRaw.flatMap((raw) => {
      const e = asRecord(raw);
      if (e == null) return [];
      const name = str(e["itemName"]);
      if (name == null) return [];
      return [
        {
          itemId: str(e["itemId"]),
          itemName: name,
          itemRarity: str(e["itemRarity"]) ?? "",
          color: str(e["slotColor"]),
        },
      ];
    });

    return [
      {
        slotName: str(a["slotName"]) ?? "—",
        itemId: str(a["itemId"]),
        itemName: str(a["itemName"]) ?? "Unknown",
        itemRarity: str(a["itemRarity"]) ?? "",
        optionAbility: tidy(str(a["optionAbility"])),
        clone,
        emblems,
      },
    ];
  });
}

/** Parse the creature snapshot blob into a single icon row (or null). */
export function parseCreature(blob: unknown): ItemIcon | null {
  const obj = asRecord(blob);
  const creature = obj && asRecord(obj["creature"]);
  if (creature == null) return null;
  return {
    itemId: str(creature["itemId"]),
    itemName: str(creature["itemName"]) ?? "Unknown",
    itemRarity: str(creature["itemRarity"]) ?? "",
    slotName: "Creature",
  };
}

/** Parse a creature's equipped artifacts into icon rows. */
export function parseArtifacts(blob: unknown): ItemIcon[] {
  const obj = asRecord(blob);
  const creature = obj && asRecord(obj["creature"]);
  if (creature == null) return [];
  const artifacts = creature["artifact"];
  if (!Array.isArray(artifacts)) return [];
  return artifacts.flatMap((entry) => {
    const a = asRecord(entry);
    if (a == null) return [];
    return [
      {
        itemId: str(a["itemId"]),
        itemName: str(a["itemName"]) ?? "Unknown",
        itemRarity: str(a["itemRarity"]) ?? "",
        slotName: str(a["slotColor"]),
      },
    ];
  });
}

/** Parse a snapshot status array (`[{name, value}]`) into render-ready rows. */
export function parseStatusList(blob: unknown): StatEntry[] {
  if (!Array.isArray(blob)) return [];
  return blob.flatMap((entry) => {
    const e = asRecord(entry);
    const name = e && str(e["name"]);
    if (name == null) return [];
    const value = e?.["value"];
    return [{ name, value: value == null ? "" : String(value) }];
  });
}

/** Parse a snapshot buff array (`[{name, level, status[]}]`). */
export function parseBuffList(blob: unknown): BuffEntry[] {
  if (!Array.isArray(blob)) return [];
  return blob.flatMap((entry) => {
    const b = asRecord(entry);
    const name = b && str(b["name"]);
    if (name == null) return [];
    return [
      {
        name,
        level: typeof b?.["level"] === "number" ? (b["level"] as number) : null,
        status: parseStatusList(b?.["status"]),
      },
    ];
  });
}

/**
 * Parse the buff-equipment snapshot blob (Neople `skill.buff`) into the
 * dfogang-style "Buff Enhancement" readout: the buff skill name + level and the
 * equipment that powers it. Degrades to empty fields when the blob is malformed.
 */
export function parseBuffEquipment(blob: unknown): BuffEnhancement {
  const root = asRecord(blob);
  const skill = root && asRecord(root["skill"]);
  const buff = skill && asRecord(skill["buff"]);
  const info = buff && asRecord(buff["skillInfo"]);
  const option = info && asRecord(info["option"]);
  const equipArr =
    buff && Array.isArray(buff["equipment"]) ? (buff["equipment"] as unknown[]) : [];
  const equipment: ItemIcon[] = equipArr.flatMap((entry) => {
    const e = asRecord(entry);
    if (e == null) return [];
    return [
      {
        itemId: str(e["itemId"]),
        itemName: str(e["itemName"]) ?? "Unknown",
        itemRarity: str(e["itemRarity"]) ?? "",
        slotName: str(e["slotName"]),
      },
    ];
  });
  return {
    skillName: info ? str(info["name"]) : null,
    level:
      option && typeof option["level"] === "number" ? (option["level"] as number) : null,
    equipment,
  };
}

/** Unwrap a buff snapshot blob (full character response) to its inner `skill.buff`. */
function buffRoot(blob: unknown): Record<string, unknown> | null {
  const root = asRecord(blob);
  const skill = root && asRecord(root["skill"]);
  return skill ? asRecord(skill["buff"]) : null;
}

/** Parse the buff-avatar snapshot blob into detailed avatar slots (reuses the avatar grid shape). */
export function parseBuffAvatars(blob: unknown): AvatarSlot[] {
  return parseAvatarsDetailed(buffRoot(blob));
}

/** Parse the buff-creature snapshot blob into icon rows (`skill.buff.creature[]`). */
export function parseBuffCreatures(blob: unknown): ItemIcon[] {
  const root = buffRoot(blob);
  const arr = root && Array.isArray(root["creature"]) ? (root["creature"] as unknown[]) : [];
  return arr.flatMap((entry) => {
    const c = asRecord(entry);
    if (c == null) return [];
    return [
      {
        itemId: str(c["itemId"]),
        itemName: str(c["itemName"]) ?? "Unknown",
        itemRarity: str(c["itemRarity"]) ?? "",
        slotName: "Creature",
      },
    ];
  });
}

/** Armor slot names that anchor the left column of the dfogang equipment grid. */
const GRID_LEFT_SLOTS = new Set(["head/shoulder", "shoulder", "top", "bottom", "belt", "shoes"]);

/** Explicit left/right column slot orderings for the hero grid (lowercased). */
const GRID_LEFT_ORDER = ["head/shoulder", "shoulder", "top", "bottom", "belt", "shoes"];
const GRID_RIGHT_ORDER = [
  "weapon",
  "title",
  "bracelet",
  "necklace",
  "sub equipment",
  "ring",
  "earrings",
  "magic stone",
];

/** Stable sort of rows by a lowercased slot-name priority list; unknown slots keep order at the end. */
function orderBySlot(rows: EquipmentRow[], order: string[]): EquipmentRow[] {
  const rank = (name: string) => {
    const i = order.indexOf(name.trim().toLowerCase());
    return i === -1 ? order.length : i;
  };
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => rank(a.row.slotName) - rank(b.row.slotName) || a.i - b.i)
    .map(({ row }) => row);
}

/**
 * Reorder the Equipment-tab list so Title appears immediately before Weapon
 * (the API emits Weapon first). All other rows keep their original order.
 */
export function orderEquipmentList(rows: EquipmentRow[]): EquipmentRow[] {
  return orderBySlot(rows, ["title", "weapon"]);
}

/** Slots shown in the left list column: weapon/title + the normal armor pieces. */
const LIST_LEFT_SLOTS = new Set([
  "title",
  "weapon",
  "top",
  "head/shoulder",
  "shoulder",
  "bottom",
  "belt",
  "shoes",
]);
const LIST_LEFT_ORDER = [
  "title",
  "weapon",
  "top",
  "head/shoulder",
  "bottom",
  "belt",
  "shoes",
];
const LIST_RIGHT_ORDER = [
  "necklace",
  "bracelet",
  "ring",
  "sub equipment",
  "magic stone",
  "earrings",
];

/**
 * Split the Equipment-tab list into two columns: weapon/title + normal armor on
 * the left, accessories + special equipment on the right. Each column is ordered
 * by its explicit slot priority list; unknown slots fall right / to the list end.
 */
export function splitEquipmentList(rows: EquipmentRow[]): {
  left: EquipmentRow[];
  right: EquipmentRow[];
} {
  const left: EquipmentRow[] = [];
  const right: EquipmentRow[] = [];
  for (const row of rows) {
    if (LIST_LEFT_SLOTS.has(row.slotName.trim().toLowerCase())) left.push(row);
    else right.push(row);
  }
  return {
    left: orderBySlot(left, LIST_LEFT_ORDER),
    right: orderBySlot(right, LIST_RIGHT_ORDER),
  };
}

/** Base stats the API enchants in equal amounts; collapsed into one "Stats" line. */
const STAT_NAMES = new Set(["Strength", "Intelligence", "Vitality", "Spirit"]);

/** Attack stats enchanted in equal amounts; collapsed into one "Atk." line. */
const ATK_NAMES = new Set(["Physical Atk.", "Magical Atk.", "Independent Atk."]);

/**
 * Collapse equal-amount enchant groups into single lines, mirroring the in-game
 * / dfogang readout: Strength/Intelligence/Vitality/Spirit → "Stats", and
 * Physical/Magical/Independent Atk. → "Atk.". Each combined line takes the first
 * member's value; other enchants pass through untouched in their original order.
 */
export function combineStatEnchants(enchant: EnchantStat[]): EnchantStat[] {
  const out: EnchantStat[] = [];
  let statInserted = false;
  let atkInserted = false;
  for (const e of enchant) {
    if (STAT_NAMES.has(e.name)) {
      if (!statInserted) {
        out.push({ name: "Stats", value: e.value });
        statInserted = true;
      }
      continue;
    }
    if (ATK_NAMES.has(e.name)) {
      if (!atkInserted) {
        out.push({ name: "Atk.", value: e.value });
        atkInserted = true;
      }
      continue;
    }
    out.push(e);
  }
  return out;
}

/**
 * Split equipment rows into the two flanking columns of the dfogang hero grid:
 * armor on the left, weapon + accessories + special gear on the right. Slot
 * matching is case-insensitive on `slotName`; unknown slots fall to the right.
 */
export function splitEquipmentForGrid(rows: EquipmentRow[]): {
  left: EquipmentRow[];
  right: EquipmentRow[];
} {
  const left: EquipmentRow[] = [];
  const right: EquipmentRow[] = [];
  for (const row of rows) {
    if (GRID_LEFT_SLOTS.has(row.slotName.trim().toLowerCase())) left.push(row);
    else right.push(row);
  }
  return {
    left: orderBySlot(left, GRID_LEFT_ORDER),
    right: orderBySlot(right, GRID_RIGHT_ORDER),
  };
}
