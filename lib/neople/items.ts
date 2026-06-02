import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { itemCache } from "@/db/schema";

import { neopleFetch } from "./client";
import { itemSchema, type Item } from "./schemas";

/** Item detail cache TTL: 30 days (item data is effectively static). */
export const ITEM_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Next.js fetch revalidation period matching {@link ITEM_TTL_MS} (seconds). */
const ITEM_REVALIDATE_S = 30 * 24 * 60 * 60;

/**
 * In-flight request map for deduplication.
 * Concurrent `getItem(sameId)` calls share a single DB+network round-trip.
 * Entries are deleted (via `finally`) once the promise settles.
 */
const inFlight = new Map<string, Promise<Item>>();

/**
 * Fetch a single item by id with a cache-aside strategy on `item_cache`.
 *
 * - Cache HIT (row exists and `fetchedAt` is within {@link ITEM_TTL_MS}):
 *   return the parsed payload without hitting the network.
 * - Cache MISS / stale: fetch from the Neople API, upsert the JSON payload,
 *   and return the freshly parsed item.
 * - Concurrent calls for the same `itemId` are coalesced: only one DB+network
 *   round-trip is performed regardless of how many callers are waiting.
 */
export function getItem(itemId: string): Promise<Item> {
  const existing = inFlight.get(itemId);
  if (existing !== undefined) return existing;

  const promise = fetchItem(itemId).finally(() => {
    inFlight.delete(itemId);
  });

  inFlight.set(itemId, promise);
  return promise;
}

async function fetchItem(itemId: string): Promise<Item> {
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

  const item = await neopleFetch(`/df/items/${itemId}`, undefined, itemSchema, {
    revalidate: ITEM_REVALIDATE_S,
  });

  await db
    .insert(itemCache)
    .values({ itemId, payload: JSON.stringify(item), fetchedAt: now })
    .onConflictDoUpdate({
      target: itemCache.itemId,
      set: { payload: JSON.stringify(item), fetchedAt: now },
    });

  return item;
}
