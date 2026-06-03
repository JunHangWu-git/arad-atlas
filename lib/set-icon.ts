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

// The matched keyword for a set name (e.g. "Paradise of Dazzling Gold Set" ->
// "Gold"). Shares the special-mapping + category logic with setIconUrl so the
// short label and the icon always agree. Returns null when nothing matches.
function matchSetKeyword(setName: string): string | null {
  for (const [match, icon] of SET_SPECIAL_MAPPINGS) {
    if (setName.includes(match)) return icon;
  }
  for (const category of SET_CATEGORIES) {
    if (setName.includes(category)) return category;
  }
  return null;
}

/**
 * Short label for an equipment set, e.g. "Paradise of Dazzling Gold Set" ->
 * "Gold". Falls back to the full name when no keyword matches, and null for
 * empty input.
 */
export function setShortLabel(
  setName: string | null | undefined,
): string | null {
  if (!setName) return null;
  return matchSetKeyword(setName) ?? setName;
}

// Module-level memo cache keyed by raw setName input. Null/undefined/empty
// strings are never stored — the fast-path guard returns before the cache is
// consulted, preserving those edge-case semantics exactly.
const _cache = new Map<string, string>();

/**
 * dfogang CDN URL for the icon of an equipment set, derived from its full name.
 * Returns the Unknown.png icon for empty/unrecognized names.
 */
export function setIconUrl(setName: string | null | undefined): string {
  if (!setName) return `${CDN_BASE}/Unknown.png`;
  const cached = _cache.get(setName);
  if (cached !== undefined) return cached;
  let result = `${CDN_BASE}/Unknown.png`;
  for (const [match, icon] of SET_SPECIAL_MAPPINGS) {
    if (setName.includes(match)) {
      result = `${CDN_BASE}/${icon}.png`;
      break;
    }
  }
  if (result === `${CDN_BASE}/Unknown.png`) {
    for (const category of SET_CATEGORIES) {
      if (setName.includes(category)) {
        result = `${CDN_BASE}/${category}.png`;
        break;
      }
    }
  }
  _cache.set(setName, result);
  return result;
}
