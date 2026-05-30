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
  /** Headline fusion-option effect, when present. */
  fusionEffect: string | null;
  enchant: EnchantStat[];
}

export interface ItemIcon {
  itemId: string | null;
  itemName: string;
  itemRarity: string;
  slotName: string | null;
  /** Optional one-line detail (e.g. avatar option ability, artifact color). */
  note?: string | null;
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
        fusionEffect: parseFusionEffect(e["fusionOption"]),
        enchant: parseEnchant(e["enchant"]),
      },
    ];
  });
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
