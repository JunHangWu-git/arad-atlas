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
