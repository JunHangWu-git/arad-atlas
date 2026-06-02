// Maps an equipment set's display name to its dfogang set-icon URL.
//
// Ported from dfogang's own frontend logic: a set's icon is chosen by matching
// keywords in the full set name (e.g. "Paradise of Dazzling Gold Set" -> Gold).
// SPECIAL_MAPPINGS are checked first (a substring that resolves to a *different*
// icon name), then the plain CATEGORIES (a substring that is itself the icon
// name). Anything unmatched falls back to Unknown.png.

const CDN_BASE = "https://cdn.dfogang.com/assets/sets";

// Substrings that map to an icon whose name differs from the matched word.
// Order matters: these win over the plain categories below.
const SET_SPECIAL_MAPPINGS: ReadonlyArray<readonly [match: string, icon: string]> = [
  ["Pack", "Alpha"],
  ["Paradise", "Gold"],
  ["Death Plane", "Shadow"],
];

// Substrings that are themselves the icon filename.
const SET_CATEGORIES = [
  "Dragon",
  "Magic",
  "Alpha",
  "Shadow",
  "Ethereal",
  "Valkyrie",
  "Nature",
  "Fairy",
  "Energy",
  "Serendipity",
  "Cleansing",
  "Gold",
  "Tales",
] as const;

/**
 * dfogang CDN URL for the icon of an equipment set, derived from its full name.
 * Returns the Unknown.png icon for empty/unrecognized names.
 */
export function setIconUrl(setName: string | null | undefined): string {
  if (!setName) return `${CDN_BASE}/Unknown.png`;
  for (const [match, icon] of SET_SPECIAL_MAPPINGS) {
    if (setName.includes(match)) return `${CDN_BASE}/${icon}.png`;
  }
  for (const category of SET_CATEGORIES) {
    if (setName.includes(category)) return `${CDN_BASE}/${category}.png`;
  }
  return `${CDN_BASE}/Unknown.png`;
}
