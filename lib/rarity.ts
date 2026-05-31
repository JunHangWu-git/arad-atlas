/**
 * Maps a raw DFO item rarity string (English API values) to a Tailwind
 * `text-rarity-*` utility class. Unknown/missing values fall back to common.
 */

type RaritySlug =
  | "common"
  | "uncommon"
  | "rare"
  | "unique"
  | "epic"
  | "legendary"
  | "mythic"
  | "chronicle";

const RARITY_MAP: Readonly<Record<string, RaritySlug>> = {
  Common: "common",
  Uncommon: "uncommon",
  Rare: "rare",
  Unique: "unique",
  Epic: "epic",
  Legendary: "legendary",
  Mythic: "mythic",
  Chronicle: "chronicle",
  // DFO Global endgame tier seen in fixtures
  Primeval: "chronicle",
};

/**
 * Full literal `text-rarity-*` class per slug. These MUST be written out in full
 * (not built via `text-rarity-${slug}`) so the Tailwind v4 scanner detects each
 * utility and emits its CSS — a dynamically concatenated class is never seen as
 * source text and silently produces no color (names fall back to white).
 */
const RARITY_CLASS: Readonly<Record<RaritySlug, string>> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  unique: "text-rarity-unique",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
  mythic: "text-rarity-mythic",
  chronicle: "text-rarity-chronicle",
};

/**
 * Returns a Tailwind utility class string for the given raw rarity value.
 * @param raw - The `itemRarity` string from the Neople API, or nullish.
 * @returns A `text-rarity-*` class string.
 */
export function rarityClass(raw: string | null | undefined): string {
  const slug: RaritySlug = (raw != null && RARITY_MAP[raw]) || "common";
  return RARITY_CLASS[slug];
}

/**
 * CSS color for an equipment-set tier label (the hero "set" badge). Maps the
 * leading rarity word of the set's `rarityName` (e.g. "Epic III") to the DFO
 * set-tier palette, falling back to the generic set accent.
 */
export function setTierColor(rarityName: string | null | undefined): string {
  const first = (rarityName ?? "").trim().split(/\s+/)[0];
  switch (first) {
    case "Unique":
      return "#c084fc"; // purple
    case "Legendary":
      return "#fb923c"; // orange
    case "Epic":
      return "#facc15"; // gold / yellow
    case "Primeval":
      return "#22d3ee"; // teal / turquoise
    default:
      return "var(--set)";
  }
}
