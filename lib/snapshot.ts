import "server-only";

import { db } from "@/db";
import {
  characters,
  fameSnapshot,
  gearSnapshot,
  statusSnapshot,
  snapshotLock,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  getCharacter,
  getStatus,
  getEquipment,
  getAvatar,
  getCreature,
  getFlag,
  getMistAssimilation,
  getBuffEquipment,
  getBuffAvatar,
  getBuffCreature,
} from "@/lib/neople/characters";

export interface SnapshotResult {
  ok: boolean;
  reason?: "locked" | "not_found";
  errors?: string[];
}

export interface FamePoint {
  fame: number | null;
  level: number | null;
  capturedAt: number;
}

export interface GearSnapshot {
  equipment: unknown;
  avatar: unknown;
  creature: unknown;
  flag: unknown;
  mistAssimilation: unknown;
  buffEquipment: unknown;
  buffAvatar: unknown;
  buffCreature: unknown;
  capturedAt: number;
}

export interface StatusSnapshotData {
  status: unknown;
  buff: unknown;
  capturedAt: number;
}

export interface SnapshotHealth {
  ok: boolean;
  maxAgeMs: number;
  characterCount: number;
}

// ok tolerance: 30h, allowing slack on the 24h cron.
const SNAPSHOT_STALE_THRESHOLD_MS = 30 * 60 * 60 * 1000;

const DEFAULT_LEASE_MS = 60_000;

export async function acquireSnapshotLock(
  id: string,
  leaseMs: number = DEFAULT_LEASE_MS,
): Promise<boolean> {
  const rows = await db.run(
    sql`
      INSERT INTO snapshot_lock(character_fk, expires_at)
      VALUES (${id}, unixepoch()*1000 + ${leaseMs})
      ON CONFLICT(character_fk) DO UPDATE
        SET expires_at = excluded.expires_at
        WHERE snapshot_lock.expires_at < unixepoch()*1000
      RETURNING character_fk
    `,
  );
  return (rows.rows?.length ?? 0) > 0;
}

export async function releaseSnapshotLock(id: string): Promise<void> {
  await db.delete(snapshotLock).where(eq(snapshotLock.characterFk, id));
}

function safeStringify(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

function safeParse(val: string | null | undefined): unknown {
  if (!val) return null;
  try {
    return JSON.parse(val) as unknown;
  } catch {
    return null;
  }
}

export async function snapshotCharacter(id: string): Promise<SnapshotResult> {
  const locked = await acquireSnapshotLock(id, DEFAULT_LEASE_MS);
  if (!locked) {
    return { ok: false, reason: "locked" };
  }

  try {
    const charRows = await db
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    if (charRows.length === 0) {
      return { ok: false, reason: "not_found" };
    }

    const char = charRows[0];
    const { serverId, characterId } = char;
    const now = Date.now();

    const [
      baseResult,
      statusResult,
      equipmentResult,
      avatarResult,
      creatureResult,
      flagResult,
      mistResult,
      buffEquipResult,
      buffAvatarResult,
      buffCreatureResult,
    ] = await Promise.allSettled([
      getCharacter(serverId, characterId),
      getStatus(serverId, characterId),
      getEquipment(serverId, characterId),
      getAvatar(serverId, characterId),
      getCreature(serverId, characterId),
      getFlag(serverId, characterId),
      getMistAssimilation(serverId, characterId),
      getBuffEquipment(serverId, characterId),
      getBuffAvatar(serverId, characterId),
      getBuffCreature(serverId, characterId),
    ]);

    const endpointNames = [
      "getCharacter",
      "getStatus",
      "getEquipment",
      "getAvatar",
      "getCreature",
      "getFlag",
      "getMistAssimilation",
      "getBuffEquipment",
      "getBuffAvatar",
      "getBuffCreature",
    ];

    const results = [
      baseResult,
      statusResult,
      equipmentResult,
      avatarResult,
      creatureResult,
      flagResult,
      mistResult,
      buffEquipResult,
      buffAvatarResult,
      buffCreatureResult,
    ];

    const errors: string[] = results
      .map((r, i) => (r.status === "rejected" ? endpointNames[i] : null))
      .filter((name): name is string => name !== null);

    const baseVal =
      baseResult.status === "fulfilled" ? baseResult.value : null;
    const statusVal =
      statusResult.status === "fulfilled" ? statusResult.value : null;
    const equipmentVal =
      equipmentResult.status === "fulfilled" ? equipmentResult.value : null;
    const avatarVal =
      avatarResult.status === "fulfilled" ? avatarResult.value : null;
    const creatureVal =
      creatureResult.status === "fulfilled" ? creatureResult.value : null;
    const flagVal =
      flagResult.status === "fulfilled" ? flagResult.value : null;
    const mistVal =
      mistResult.status === "fulfilled" ? mistResult.value : null;
    const buffEquipVal =
      buffEquipResult.status === "fulfilled" ? buffEquipResult.value : null;
    const buffAvatarVal =
      buffAvatarResult.status === "fulfilled" ? buffAvatarResult.value : null;
    const buffCreatureVal =
      buffCreatureResult.status === "fulfilled"
        ? buffCreatureResult.value
        : null;

    await db.transaction(async (tx) => {
      await tx.insert(fameSnapshot).values({
        characterFk: id,
        fame: (baseVal as { fame?: number } | null)?.fame ?? null,
        level: (baseVal as { level?: number } | null)?.level ?? null,
        capturedAt: now,
      });

      await tx.insert(gearSnapshot).values({
        characterFk: id,
        equipment: safeStringify(equipmentVal),
        avatar: safeStringify(avatarVal),
        creature: safeStringify(creatureVal),
        flag: safeStringify(flagVal),
        mistAssimilation: safeStringify(mistVal),
        talisman: null,
        buffEquipment: safeStringify(buffEquipVal),
        buffAvatar: safeStringify(buffAvatarVal),
        buffCreature: safeStringify(buffCreatureVal),
        capturedAt: now,
      });

      await tx.insert(statusSnapshot).values({
        characterFk: id,
        status: safeStringify(
          (statusVal as { status?: unknown } | null)?.status ?? null,
        ),
        buff: safeStringify(
          (statusVal as { buff?: unknown } | null)?.buff ?? null,
        ),
        capturedAt: now,
      });

      await tx
        .update(characters)
        .set({
          level: (baseVal as { level?: number } | null)?.level ?? char.level,
          jobName:
            (baseVal as { jobName?: string } | null)?.jobName ?? char.jobName,
          adventureName:
            (baseVal as { adventureName?: string } | null)?.adventureName ??
            char.adventureName,
          updatedAt: now,
        })
        .where(eq(characters.id, id));
    });

    return { ok: true, errors: errors.length > 0 ? errors : undefined };
  } finally {
    await releaseSnapshotLock(id);
  }
}

export async function getFameHistory(
  id: string,
  limit: number = 100,
): Promise<FamePoint[]> {
  const rows = await db
    .select({
      fame: fameSnapshot.fame,
      level: fameSnapshot.level,
      capturedAt: fameSnapshot.capturedAt,
    })
    .from(fameSnapshot)
    .where(eq(fameSnapshot.characterFk, id))
    .orderBy(desc(fameSnapshot.capturedAt))
    .limit(limit);

  return rows
    .map((r) => ({
      fame: r.fame,
      level: r.level,
      capturedAt: r.capturedAt,
    }))
    .reverse();
}

export async function getLatestGearSnapshot(
  id: string,
): Promise<GearSnapshot | null> {
  const rows = await db
    .select()
    .from(gearSnapshot)
    .where(eq(gearSnapshot.characterFk, id))
    .orderBy(desc(gearSnapshot.capturedAt))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    equipment: safeParse(row.equipment),
    avatar: safeParse(row.avatar),
    creature: safeParse(row.creature),
    flag: safeParse(row.flag),
    mistAssimilation: safeParse(row.mistAssimilation),
    buffEquipment: safeParse(row.buffEquipment),
    buffAvatar: safeParse(row.buffAvatar),
    buffCreature: safeParse(row.buffCreature),
    capturedAt: row.capturedAt,
  };
}

export async function getLatestStatusSnapshot(
  id: string,
): Promise<StatusSnapshotData | null> {
  const rows = await db
    .select()
    .from(statusSnapshot)
    .where(eq(statusSnapshot.characterFk, id))
    .orderBy(desc(statusSnapshot.capturedAt))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    status: safeParse(row.status),
    buff: safeParse(row.buff),
    capturedAt: row.capturedAt,
  };
}

export async function getAllCharacterIds(): Promise<string[]> {
  const rows = await db.select({ id: characters.id }).from(characters);
  return rows.map((r) => r.id);
}

// Health = staleness of the OLDEST character's latest fame snapshot.
// A character with zero snapshots is treated as infinitely stale (not ok).
export async function getSnapshotHealth(): Promise<SnapshotHealth> {
  const ids = await getAllCharacterIds();
  const characterCount = ids.length;

  if (characterCount === 0) {
    return { ok: true, maxAgeMs: 0, characterCount: 0 };
  }

  // Latest capturedAt per character that HAS a fame snapshot.
  const latestRows = await db
    .select({
      characterFk: fameSnapshot.characterFk,
      latest: sql<number>`max(${fameSnapshot.capturedAt})`,
    })
    .from(fameSnapshot)
    .groupBy(fameSnapshot.characterFk);

  const latestByChar = new Map<string, number>();
  for (const row of latestRows) {
    if (row.characterFk !== null) {
      latestByChar.set(row.characterFk, row.latest);
    }
  }

  // Any character missing a snapshot → stale.
  const hasMissing = ids.some((id) => !latestByChar.has(id));
  if (hasMissing) {
    return {
      ok: false,
      maxAgeMs: Number.POSITIVE_INFINITY,
      characterCount,
    };
  }

  const now = Date.now();
  const oldestLatest = Math.min(...Array.from(latestByChar.values()));
  const maxAgeMs = now - oldestLatest;

  return {
    ok: maxAgeMs < SNAPSHOT_STALE_THRESHOLD_MS,
    maxAgeMs,
    characterCount,
  };
}
