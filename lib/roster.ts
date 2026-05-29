import "server-only";

import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { searchCharacter, getCharacter } from "@/lib/neople/characters";

export interface RosterCharacter {
  id: string;
  serverId: string;
  characterId: string;
  characterName: string;
  adventureName: string | null;
  jobId: string | null;
  jobGrowId: string | null;
  jobName: string | null;
  level: number | null;
  guildName: string | null;
  guideUrls: string[];
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
    level: row.level ?? null,
    guildName: row.guildName ?? null,
    guideUrls: parseGuideUrls(row.guideUrls),
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

export async function listRoster(): Promise<RosterCharacter[]> {
  const rows = await db
    .select()
    .from(characters)
    .orderBy(desc(characters.createdAt));
  return rows.map(rowToRosterCharacter);
}

export async function getRosterCharacter(id: string): Promise<RosterCharacter | null> {
  const rows = await db
    .select()
    .from(characters)
    .where(eq(characters.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  return rowToRosterCharacter(rows[0]);
}

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
    level: number | null;
    characterName: string;
  } = {
    guildName: null,
    adventureName: "adventureName" in searchRow ? (searchRow.adventureName as string | null) ?? null : null,
    jobId: searchRow.jobId ?? null,
    jobGrowId: searchRow.jobGrowId ?? null,
    jobName: searchRow.jobName ?? null,
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
      level: base.level ?? null,
      characterName: base.characterName,
    };
  } catch {
    // Enrich failed — fall back to search row data
  }

  const now = Date.now();

  await db
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
      level: enriched.level,
      guildName: enriched.guildName,
      guideUrls: "[]",
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
        level: enriched.level,
        guildName: enriched.guildName,
        updatedAt: now,
      },
    });

  const saved = await getRosterCharacter(id);
  if (!saved) {
    throw new Error(`Failed to retrieve character after upsert: ${id}`);
  }
  return saved;
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.delete(characters).where(eq(characters.id, id));
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
  await db
    .update(characters)
    .set({ guideUrls: JSON.stringify(updated), updatedAt: Date.now() })
    .where(eq(characters.id, id));

  const saved = await getRosterCharacter(id);
  if (!saved) {
    throw new Error(`Failed to retrieve character after update: ${id}`);
  }
  return saved;
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
  await db
    .update(characters)
    .set({ guideUrls: JSON.stringify(updated), updatedAt: Date.now() })
    .where(eq(characters.id, id));

  const saved = await getRosterCharacter(id);
  if (!saved) {
    throw new Error(`Failed to retrieve character after update: ${id}`);
  }
  return saved;
}
