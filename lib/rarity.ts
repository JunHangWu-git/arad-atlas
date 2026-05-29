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
 * Returns a Tailwind utility class string for the given raw rarity value.
 * @param raw - The `itemRarity` string from the Neople API, or nullish.
 * @returns A `text-rarity-*` class string.
 */
export function rarityClass(raw: string | null | undefined): string {
  const slug: RaritySlug = (raw != null && RARITY_MAP[raw]) || "common";
  return `text-rarity-${slug}`;
}
