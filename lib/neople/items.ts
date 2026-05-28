import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { itemCache } from "@/db/schema";

import { neopleFetch } from "./client";
import { itemSchema, type Item } from "./schemas";

/** Item detail cache TTL: 30 days (item data is effectively static). */
export const ITEM_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fetch a single item by id with a cache-aside strategy on `item_cache`.
 *
 * - Cache HIT (row exists and `fetchedAt` is within {@link ITEM_TTL_MS}):
 *   return the parsed payload without hitting the network.
 * - Cache MISS / stale: fetch from the Neople API, upsert the JSON payload,
 *   and return the freshly parsed item.
 */
export async function getItem(itemId: string): Promise<Item> {
  const rows = await db
    .select()
    .from(itemCache)
    .where(eq(itemCache.itemId, itemId))
    .limit(1);

  const cached = rows[0];
  const now = Date.now();

  if (cached?.payload && cached.fetchedAt !== null && now - cached.fetchedAt < ITEM_TTL_MS) {
    return JSON.parse(cached.payload) as Item;
  }

  const item = await neopleFetch(`/df/items/${itemId}`, undefined, itemSchema);

  await db
    .insert(itemCache)
    .values({ itemId, payload: JSON.stringify(item), fetchedAt: now })
    .onConflictDoUpdate({
      target: itemCache.itemId,
      set: { payload: JSON.stringify(item), fetchedAt: now },
    });

  return item;
}
