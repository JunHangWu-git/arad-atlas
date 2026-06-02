import "server-only";

import { cache } from "react";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { searchCharacter, getCharacter } from "@/lib/neople/characters";
import {
  getLatestFameByCharacter,
  getLatestEquipmentByCharacter,
} from "@/lib/snapshot";
import type { ItemIcon, EquipmentSet } from "@/lib/gear";

export interface RosterCharacter {
  id: string;
  serverId: string;
  characterId: string;
  characterName: string;
  adventureName: string | null;
  jobId: string | null;
  jobGrowId: string | null;
  jobName: string | null;
  jobGrowName: string | null;
  level: number | null;
  guildName: string | null;
  guideUrls: string[];
  position: number | null;
  fame: number | null;
  /** Latest equipped-gear icons, for the card frame. Empty until snapshotted. */
  equipment: ItemIcon[];
  /** Primary armor/accessory set (name + set-point) for the card headline. */
  equipmentSet: EquipmentSet | null;
  createdAt: number | null;
  updatedAt: number | null;
}

type DbRow = typeof characters.$inferSelect;

function parseGuideUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function rowToRosterCharacter(row: DbRow): RosterCharacter {
  return {
    id: row.id,
    serverId: row.serverId,
    characterId: row.characterId,
    characterName: row.characterName,
    adventureName: row.adventureName ?? null,
    jobId: row.jobId ?? null,
    jobGrowId: row.jobGrowId ?? null,
    jobName: row.jobName ?? null,
    jobGrowName: row.jobGrowName ?? null,
    level: row.level ?? null,
    guildName: row.guildName ?? null,
    guideUrls: parseGuideUrls(row.guideUrls),
    position: row.position ?? null,
    fame: null,
    equipment: [],
    equipmentSet: null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

export async function listRoster(): Promise<RosterCharacter[]> {
  // Manual board order: positioned cards first (asc), unpositioned (null)
  // last, with createdAt-desc as a stable tiebreak.
  const rows = await db
    .select()
    .from(characters)
    .orderBy(
      sql`${characters.position} is null`,
      characters.position,
      desc(characters.createdAt),
    );
  return rows.map(rowToRosterCharacter);
}

// Roster plus latest fame per character, for the main-page card grid. Keeps
// listRoster() untouched so other callers are unaffected.
export async function listRosterWithFame(): Promise<RosterCharacter[]> {
  const [roster, fameByChar, equipByChar] = await Promise.all([
    listRoster(),
    getLatestFameByCharacter(),
    getLatestEquipmentByCharacter(),
  ]);
  return roster.map((c) => {
    const gear = equipByChar.get(c.id);
    return {
      ...c,
      fame: fameByChar.get(c.id) ?? null,
      equipment: gear?.icons ?? [],
      equipmentSet: gear?.set ?? null,
    };
  });
}

export const getRosterCharacter = cache(
  async (id: string): Promise<RosterCharacter | null> => {
    const rows = await db
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);
    if (rows.length === 0) return null;
    return rowToRosterCharacter(rows[0]);
  },
);

export async function addCharacter(
  serverId: string,
  characterName: string,
): Promise<RosterCharacter> {
  const search = await searchCharacter(serverId, characterName);

  if (search.rows.length === 0) {
    throw new Error(`Character not found: ${characterName} on ${serverId}`);
  }

  const searchRow = search.rows[0];
  const characterId = searchRow.characterId;
  const id = `${serverId}-${characterId}`;

  let enriched: {
    guildName: string | null;
    adventureName: string | null;
    jobId: string | null;
    jobGrowId: string | null;
    jobName: string | null;
    jobGrowName: string | null;
    level: number | null;
    characterName: string;
  } = {
    guildName: null,
    adventureName: "adventureName" in searchRow ? (searchRow.adventureName as string | null) ?? null : null,
    jobId: searchRow.jobId ?? null,
    jobGrowId: searchRow.jobGrowId ?? null,
    jobName: searchRow.jobName ?? null,
    jobGrowName: searchRow.jobGrowName ?? null,
    level: searchRow.level ?? null,
    characterName: searchRow.characterName,
  };

  try {
    const base = await getCharacter(serverId, characterId);
    enriched = {
      guildName: base.guildName ?? null,
      adventureName: base.adventureName ?? null,
      jobId: base.jobId ?? null,
      jobGrowId: base.jobGrowId ?? null,
      jobName: base.jobName ?? null,
      jobGrowName: base.jobGrowName ?? null,
      level: base.level ?? null,
      characterName: base.characterName,
    };
  } catch {
    // Enrich failed — fall back to search row data
  }

  const now = Date.now();

  // New characters append to the end of the manual board order. Existing rows
  // keep their position (not in the onConflictDoUpdate set below).
  const [{ max: maxPosition }] = await db
    .select({ max: sql<number | null>`max(${characters.position})` })
    .from(characters);
  const nextPosition = (maxPosition ?? -1) + 1;

  const [saved] = await db
    .insert(characters)
    .values({
      id,
      serverId,
      characterId,
      characterName: enriched.characterName,
      adventureName: enriched.adventureName,
      jobId: enriched.jobId,
      jobGrowId: enriched.jobGrowId,
      jobName: enriched.jobName,
      jobGrowName: enriched.jobGrowName,
      level: enriched.level,
      guildName: enriched.guildName,
      guideUrls: "[]",
      position: nextPosition,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [characters.serverId, characters.characterId],
      set: {
        characterName: enriched.characterName,
        adventureName: enriched.adventureName,
        jobId: enriched.jobId,
        jobGrowId: enriched.jobGrowId,
        jobName: enriched.jobName,
        jobGrowName: enriched.jobGrowName,
        level: enriched.level,
        guildName: enriched.guildName,
        updatedAt: now,
      },
    })
    .returning();

  if (!saved) {
    throw new Error(`Failed to retrieve character after upsert: ${id}`);
  }
  return rowToRosterCharacter(saved);
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.delete(characters).where(eq(characters.id, id));
}

// Persist a manual board order: each id's index in `orderedIds` becomes its
// `position`. Ids not present are left untouched — they keep their old position
// value and may interleave. Callers should send the full roster id list.
export async function reorderCharacters(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const now = Date.now();
  const [first, ...rest] = orderedIds.map((id, i) =>
    db
      .update(characters)
      .set({ position: i, updatedAt: now })
      .where(eq(characters.id, id)),
  );
  // libSQL batch runs all statements in a single atomic transaction and a
  // single round-trip, replacing the previous per-id UPDATE loop.
  await db.batch([first, ...rest]);
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function addGuideUrl(
  id: string,
  url: string,
): Promise<RosterCharacter> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Guide URL must not be blank.");
  }
  if (!isValidHttpUrl(trimmed)) {
    throw new Error("Guide URL must be a valid http or https URL.");
  }

  const char = await getRosterCharacter(id);
  if (!char) {
    throw new Error(`Character not found: ${id}`);
  }

  const existing = new Set(char.guideUrls);
  if (existing.has(trimmed)) {
    return char;
  }

  const updated = [...char.guideUrls, trimmed];
  const [saved] = await db
    .update(characters)
    .set({ guideUrls: JSON.stringify(updated), updatedAt: Date.now() })
    .where(eq(characters.id, id))
    .returning();

  if (!saved) {
    throw new Error(`Failed to retrieve character after update: ${id}`);
  }
  return rowToRosterCharacter(saved);
}

export async function removeGuideUrl(
  id: string,
  url: string,
): Promise<RosterCharacter> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Guide URL must not be blank.");
  }

  const char = await getRosterCharacter(id);
  if (!char) {
    throw new Error(`Character not found: ${id}`);
  }

  const updated = char.guideUrls.filter((u) => u !== trimmed);
  const [saved] = await db
    .update(characters)
    .set({ guideUrls: JSON.stringify(updated), updatedAt: Date.now() })
    .where(eq(characters.id, id))
    .returning();

  if (!saved) {
    throw new Error(`Failed to retrieve character after update: ${id}`);
  }
  return rowToRosterCharacter(saved);
}
