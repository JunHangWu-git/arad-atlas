/**
 * Character portrait URL builder for the Neople public image CDN.
 *
 * No API key is required for these image URLs, so this module is safe to use
 * on the client and intentionally does NOT import "server-only".
 */

const IMG_BASE_URL = "https://img-api.dfoneople.com";

/** dfogang dynamic icon renderer (item/title/aura/creature icons). No API key. */
const DFOGANG_API_BASE = "https://api.dfogang.com";

/** dfogang static-asset CDN mirror — preferred over the bare dfogang.com host. */
const DFOGANG_CDN_BASE = "https://cdn.dfogang.com";

export function portraitUrl(serverId: string, characterId: string, zoom = 1): string {
  return `${IMG_BASE_URL}/df/servers/${serverId}/characters/${characterId}?zoom=${zoom}`;
}

/** Base64-encode in either runtime (browser `btoa` or Node `Buffer`). */
function toBase64(input: string): string {
  if (typeof btoa === "function") {
    return btoa(input);
  }
  return Buffer.from(input, "utf8").toString("base64");
}

/**
 * Character render image via the dfogang public API. The Neople Global portrait
 * endpoint 404s, so dfogang composites its own render keyed on `serverId` (lower-
 * cased) + `characterName`.
 *
 * Pass a STABLE `version` (e.g. a data-snapshot timestamp) to append dfogang's
 * `?v=` base64 cache-buster (e.g. `/image/cain/coo1guy.png?v=MTc4MDI2Mz…`). It
 * must be deterministic — a per-render value like `Date.now()` would differ
 * between SSR and hydration and trip a React hydration mismatch. Omit it for a
 * stable, cacheable URL.
 */
export function dfogangPortraitUrl(
  serverId: string,
  characterName: string,
  version?: string | number,
): string {
  const server = serverId.toLowerCase();
  const base = `${DFOGANG_API_BASE}/image/${server}/${encodeURIComponent(characterName)}.png`;
  return version === undefined ? base : `${base}?v=${toBase64(String(version))}`;
}

/**
 * Public CDN icon URL for any in-game item (gear, avatar, creature, …).
 *
 * Unlike character portraits — which 404 on the Global API — item images are
 * served reliably and need no API key, so this is client-safe.
 */
export function itemImageUrl(itemId: string): string {
  return `${IMG_BASE_URL}/df/items/${itemId}`;
}

/**
 * Title icon URL via the dfogang public API. The Neople item CDN 404s on most
 * title item IDs, but dfogang renders title icons from `itemId` + name, so we
 * source title icons there. Name is URL-encoded (titles carry brackets/spaces).
 */
export function titleIconUrl(itemId: string, itemName: string): string {
  return `${DFOGANG_API_BASE}/api/title-icon/${itemId}/${encodeURIComponent(itemName)}`;
}

/**
 * Aura icon URL via the dfogang public API. Mirrors {@link titleIconUrl}; fills
 * gaps where the Neople item CDN 404s on aura item IDs.
 */
export function auraIconUrl(itemId: string, itemName: string): string {
  return `${DFOGANG_API_BASE}/api/aura-icon/${itemId}/${encodeURIComponent(itemName)}`;
}

/**
 * Creature icon URL via the dfogang public API. Mirrors {@link titleIconUrl};
 * fills gaps where the Neople item CDN 404s on creature item IDs.
 */
export function creatureIconUrl(itemId: string, itemName: string): string {
  return `${DFOGANG_API_BASE}/api/creature-icon/${itemId}/${encodeURIComponent(itemName)}`;
}

/**
 * Item icon URL via the dfogang public API. A backup for {@link itemImageUrl}
 * (the Neople CDN) when that 404s; dfogang renders the icon from `itemId` alone.
 */
export function dfogangItemIconUrl(itemId: string): string {
  return `${DFOGANG_API_BASE}/api/item-icon/${itemId}`;
}

/** Class-art image variants served under dfogang's `/assets/characters` tree. */
export type ClassArtVariant = "icon" | "card" | "gif" | "full";

const CLASS_ART_SUFFIX: Readonly<Record<ClassArtVariant, string>> = {
  icon: ".png",
  card: "card.jpg",
  gif: "_4x.gif",
  full: "full.png",
};

/**
 * Single-awakening classes carry `jobGrowName === "Awakening 1"`, which is not a
 * valid asset slug. Their art is keyed on the (normalized) job name instead.
 */
const SINGLE_AWAKENING_SLUG: Readonly<Record<string, string>> = {
  "Dark Knight": "darkknight",
  Creator: "creator",
};

/**
 * `Demonic Lancer / Impaler` has no `full.png` (only icon/card/gif), so callers
 * requesting `full` are transparently downgraded to `card`.
 */
const FULL_ART_FALLBACK_KEYS: ReadonlySet<string> = new Set(["Demonic Lancer/Impaler"]);

/**
 * Normalize a `jobGrowName` into a dfogang asset slug: strip the awakening
 * `"Neo: "` prefix, remove all whitespace, lowercase.
 *   e.g. "Neo: Blade Master" -> "blademaster", "Sword Master" -> "swordmaster"
 */
function normalizeGrowSlug(jobGrowName: string): string {
  return jobGrowName
    .replace(/^Neo:\s*/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * Class-art URL from dfogang's static CDN, keyed on `jobName` + `jobGrowName`
 * (both fields we already store per character). No API key required.
 *
 * Variants by size: `icon` (~6 KB, lists) < `card` (~0.2 MB) < `gif` (~0.4 MB,
 * animated) < `full` (~0.5–2.7 MB, detail pages only).
 *
 * Returns `null` when no art is expected — currently only the synthetic
 * `"Awakening 1"` grow on classes other than Dark Knight / Creator — so callers
 * can fall back to a placeholder without guessing a 404-ing URL.
 */
export function classArtUrl(
  jobName: string,
  jobGrowName: string,
  variant: ClassArtVariant = "icon",
): string | null {
  const special = SINGLE_AWAKENING_SLUG[jobName];
  const slug = special ?? normalizeGrowSlug(jobGrowName);
  if (!slug || (jobGrowName.trim() === "Awakening 1" && !special)) {
    return null;
  }

  // Downgrade `full` to `card` where `full.png` is known to be missing.
  const resolvedVariant =
    variant === "full" && FULL_ART_FALLBACK_KEYS.has(`${jobName}/${jobGrowName}`)
      ? "card"
      : variant;

  const suffix = CLASS_ART_SUFFIX[resolvedVariant];
  return `${DFOGANG_CDN_BASE}/assets/characters/${encodeURIComponent(jobName)}/${slug}${suffix}`;
}
