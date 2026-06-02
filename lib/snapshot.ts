import "server-only";

import { cache } from "react";
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
  parseEquipment,
  parseEquipmentSet,
  type ItemIcon,
  type EquipmentSet,
} from "@/lib/gear";
import {
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

    const statusVal =
      statusResult.status === "fulfilled" ? statusResult.value : null;
    // The status response extends characterBaseSchema, so it carries the same
    // base identity envelope (fame/level/jobName/jobGrowName/adventureName)
    // that the dedicated getCharacter() call used to provide. Sourcing the base
    // fields from it drops one per-character round-trip.
    const baseVal = statusVal;
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
          jobGrowName:
            (baseVal as { jobGrowName?: string } | null)?.jobGrowName ??
            char.jobGrowName,
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

export const getLatestGearSnapshot = cache(
  async (id: string): Promise<GearSnapshot | null> => {
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
  },
);

export const getLatestStatusSnapshot = cache(
  async (id: string): Promise<StatusSnapshotData | null> => {
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
  },
);

// Latest fame value per character, keyed by characters.id. Characters with no
// fame snapshot are simply absent from the map (callers default to null).
// Single grouped+joined query — never per-character (avoids N+1 on the grid).
export async function getLatestFameByCharacter(): Promise<Map<string, number | null>> {
  const result = await db.run(
    sql`
      SELECT f.character_fk AS characterFk, f.fame AS fame
      FROM fame_snapshot f
      JOIN (
        SELECT character_fk, MAX(captured_at) AS mx
        FROM fame_snapshot
        GROUP BY character_fk
      ) latest
        ON f.character_fk = latest.character_fk
       AND f.captured_at = latest.mx
    `,
  );

  const map = new Map<string, number | null>();
  for (const row of result.rows ?? []) {
    const r = row as { characterFk?: unknown; fame?: unknown };
    if (typeof r.characterFk === "string") {
      map.set(r.characterFk, typeof r.fame === "number" ? r.fame : null);
    }
  }
  return map;
}

/** Latest gear-derived card data per character: equipped icons + the primary
 *  armor/accessory set (name + set-point). */
export interface LatestGearCard {
  icons: ItemIcon[];
  set: EquipmentSet | null;
}

// Latest equipment icon set + armor set per character, keyed by characters.id.
// Mirrors getLatestFameByCharacter: one grouped query (never per-character) to
// dodge an N+1 on the grid. Both the icons and the set are parsed from the same
// blob, so the set readout is free. Characters without a gear snapshot are
// absent from the map.
export async function getLatestEquipmentByCharacter(): Promise<
  Map<string, LatestGearCard>
> {
  const result = await db.run(
    sql`
      SELECT g.character_fk AS characterFk, g.equipment AS equipment
      FROM gear_snapshot g
      JOIN (
        SELECT character_fk, MAX(captured_at) AS mx
        FROM gear_snapshot
        GROUP BY character_fk
      ) latest
        ON g.character_fk = latest.character_fk
       AND g.captured_at = latest.mx
    `,
  );

  const map = new Map<string, LatestGearCard>();
  for (const row of result.rows ?? []) {
    const r = row as { characterFk?: unknown; equipment?: unknown };
    if (typeof r.characterFk !== "string") continue;
    const blob = safeParse(typeof r.equipment === "string" ? r.equipment : null);
    const icons: ItemIcon[] = parseEquipment(blob).map((e) => ({
      itemId: e.itemId,
      itemName: e.itemName,
      itemRarity: e.itemRarity,
      slotName: e.slotName,
    }));
    map.set(r.characterFk, { icons, set: parseEquipmentSet(blob) });
  }
  return map;
}

export async function getAllCharacterIds(): Promise<string[]> {
  const rows = await db.select({ id: characters.id }).from(characters);
  return rows.map((r) => r.id);
}

// Health = staleness of the OLDEST character's latest fame snapshot.
// A character with zero snapshots is treated as infinitely stale (not ok).
export async function getSnapshotHealth(): Promise<SnapshotHealth> {
  // One pass: every character LEFT JOINed to its latest fame snapshot.
  // Missing snapshots surface as a NULL `latest`.
  const rows = await db
    .select({
      id: characters.id,
      latest: sql<number | null>`max(${fameSnapshot.capturedAt})`,
    })
    .from(characters)
    .leftJoin(fameSnapshot, eq(fameSnapshot.characterFk, characters.id))
    .groupBy(characters.id);

  const characterCount = rows.length;

  if (characterCount === 0) {
    return { ok: true, maxAgeMs: 0, characterCount: 0 };
  }

  // Any character without a fame snapshot (NULL latest) → infinitely stale.
  const hasMissing = rows.some((row) => row.latest === null);
  if (hasMissing) {
    return {
      ok: false,
      maxAgeMs: Number.POSITIVE_INFINITY,
      characterCount,
    };
  }

  const now = Date.now();
  const oldestLatest = Math.min(
    ...rows.map((row) => row.latest as number),
  );
  const maxAgeMs = now - oldestLatest;

  return {
    ok: maxAgeMs < SNAPSHOT_STALE_THRESHOLD_MS,
    maxAgeMs,
    characterCount,
  };
}
