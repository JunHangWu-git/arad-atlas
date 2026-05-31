/**
 * Character portrait URL builder for the Neople public image CDN.
 *
 * No API key is required for these image URLs, so this module is safe to use
 * on the client and intentionally does NOT import "server-only".
 */

const IMG_BASE_URL = "https://img-api.dfoneople.com";

export function portraitUrl(serverId: string, characterId: string, zoom = 1): string {
  return `${IMG_BASE_URL}/df/servers/${serverId}/characters/${characterId}?zoom=${zoom}`;
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
  return `https://api.dfogang.com/api/title-icon/${itemId}/${encodeURIComponent(itemName)}`;
}
