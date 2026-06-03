import "server-only";

import { db } from "@/db";
import { progressionNote } from "@/db/schema";
import { listRoster } from "@/lib/roster";
import {
  getLatestFameByCharacter,
  getLatestGearBlobsByCharacter,
} from "@/lib/snapshot";
import {
  parseEquipment,
  parseEquipmentSet,
  parseBuffEquipment,
  parseAvatars,
  parseCreature,
  type EquipmentRow,
} from "@/lib/gear";
import type { LatestGearBlobs } from "@/lib/snapshot";
import { getItem } from "@/lib/neople/items";
import {
  itemAtkAmpPct,
  ampMetric,
  type AmpSlot,
  type MetricStatus,
  type ProgressionMetric,
} from "@/lib/amp";

// Shared cell types live in lib/amp (pure, no server-only) so they can be
// imported by both the server data layer and the client table.
export type { MetricStatus, ProgressionMetric } from "@/lib/amp";

export interface ProgressionRow {
  id: string;
  characterName: string;
  jobGrowName: string | null;
  jobName: string | null;
  level: number | null;
  /** Raw latest fame (uncolored — thresholds shift every patch). */
  fame: number | null;
  setName: string | null;
  setRarityName: string | null;
  /** Auto-derived, color-coded metrics. */
  setPoint: ProgressionMetric;
  amplify: ProgressionMetric;
  enchant: ProgressionMetric;
  buff: ProgressionMetric;
  title: ProgressionMetric;
  aura: ProgressionMetric;
  creature: ProgressionMetric;
  /** Manual annotations (null when never set). */
  priority: number | null;
  note: string | null;
  /** True when the character has no gear snapshot yet (metrics are all "todo"). */
  hasSnapshot: boolean;
}

// --- Graduation thresholds (heuristic, tune freely) -------------------------
// These encode "what counts as graduated" for each metric. They are deliberately
// centralized so a single edit re-colors the whole matrix.

/** Set-point total: ~2570 is a maxed epic set; 2400+ is close. */
const SET_POINT_DONE = 2570;
const SET_POINT_PARTIAL = 2400;

/** Per-slot reinforce/amp level on the weakest armor piece (full-body amplify). */
const AMP_DONE = 11;
const AMP_PARTIAL = 8;

/** Buff-skill level (TP-maxed buffs sit around Lv30). */
const BUFF_DONE = 30;
const BUFF_PARTIAL = 25;

/** Armor slots that the "full-body amplify" reading is taken across. */
const ARMOR_SLOTS = new Set([
  "head/shoulder",
  "shoulder",
  "top",
  "bottom",
  "belt",
  "shoes",
]);

/** Placeholder for an empty cosmetic slot (no item equipped). */
const NEUTRAL_METRIC: ProgressionMetric = { label: "—", status: "none" };

/** The avatar slot that carries the character's aura (the Neople slotName). */
const AURA_SLOT = "aura avatar";

/**
 * Resolve a cosmetic slot's Atk. Amp. cell: look up the equipped item's detail
 * (cached in item_cache) and threshold its Atk. Amp. percent. An empty slot is
 * the muted placeholder; a failed lookup degrades to the item name uncolored.
 */
async function resolveSlotMetric(
  slot: AmpSlot,
  itemId: string | null,
  itemName: string | null,
): Promise<ProgressionMetric> {
  if (itemId == null) return NEUTRAL_METRIC;
  try {
    const item = await getItem(itemId);
    return ampMetric(slot, itemAtkAmpPct(item), itemName);
  } catch {
    return { label: itemName ?? "—", status: "none" };
  }
}

function bandStatus(
  value: number,
  doneAt: number,
  partialAt: number,
): MetricStatus {
  if (value >= doneAt) return "done";
  if (value >= partialAt) return "partial";
  return "todo";
}

/** Lowest reinforce/amp level among equipped armor pieces ("weakest link"). */
function deriveAmplify(rows: EquipmentRow[]): number {
  const armor = rows.filter((r) =>
    ARMOR_SLOTS.has(r.slotName.trim().toLowerCase()),
  );
  if (armor.length === 0) return 0;
  return Math.min(...armor.map((r) => r.reinforce));
}

/** Fraction (0–1) of equipped pieces carrying at least one enchant. */
function deriveEnchantCoverage(rows: EquipmentRow[]): number {
  if (rows.length === 0) return 0;
  const enchanted = rows.filter((r) => r.enchant.length > 0).length;
  return enchanted / rows.length;
}

interface DerivedMetrics {
  setName: string | null;
  /** Set tier label, e.g. "Epic III" — drives the set-point tier color. */
  setRarityName: string | null;
  setPoint: ProgressionMetric;
  amplify: ProgressionMetric;
  enchant: ProgressionMetric;
  buff: ProgressionMetric;
}

const EMPTY_METRIC: ProgressionMetric = { label: "—", status: "todo" };

/** Pure: turn the latest gear blobs into the color-coded matrix cells. Each blob
 *  is optional — a missing one yields placeholder ("—") metrics for its slots. */
export function deriveMetrics(blobs: Partial<LatestGearBlobs>): DerivedMetrics {
  const rows = parseEquipment(blobs.equipment);
  const set = parseEquipmentSet(blobs.equipment);
  const buff = parseBuffEquipment(blobs.buffEquipment);

  const setPointVal = set?.setPoint ?? null;
  const ampVal = deriveAmplify(rows);
  const enchantPct = deriveEnchantCoverage(rows);
  const buffLevel = buff.level ?? null;

  return {
    setName: set?.name ?? null,
    setRarityName: set?.rarityName ?? null,
    setPoint:
      setPointVal == null
        ? EMPTY_METRIC
        : {
            label: setPointVal.toLocaleString(),
            status: bandStatus(setPointVal, SET_POINT_DONE, SET_POINT_PARTIAL),
          },
    amplify:
      rows.length === 0
        ? EMPTY_METRIC
        : {
            label: `+${ampVal}`,
            status: bandStatus(ampVal, AMP_DONE, AMP_PARTIAL),
          },
    enchant:
      rows.length === 0
        ? EMPTY_METRIC
        : {
            label: `${Math.round(enchantPct * 100)}%`,
            status:
              enchantPct >= 1 ? "done" : enchantPct >= 0.5 ? "partial" : "todo",
          },
    buff:
      buffLevel == null
        ? EMPTY_METRIC
        : {
            label: `Lv${buffLevel}`,
            status: bandStatus(buffLevel, BUFF_DONE, BUFF_PARTIAL),
          },
  };
}

interface SlotItem {
  itemId: string | null;
  itemName: string | null;
}

type ProgressionNoteRow = typeof progressionNote.$inferSelect;

/** Read all manual note rows. Degrades to empty if the table does not exist yet
 *  (e.g. a deploy whose migration has not run), so the matrix still renders. */
async function listProgressionNotes(): Promise<ProgressionNoteRow[]> {
  try {
    return await db.select().from(progressionNote);
  } catch {
    return [];
  }
}

/** Pull the equipped title / aura / creature item ids + names from gear blobs. */
function cosmeticSlotItems(blobs: Partial<LatestGearBlobs>): {
  title: SlotItem;
  aura: SlotItem;
  creature: SlotItem;
} {
  const titleRow = parseEquipment(blobs.equipment).find(
    (r) => r.slotName.trim().toLowerCase() === "title",
  );
  const auraIcon = parseAvatars(blobs.avatar).find(
    (a) => (a.slotName ?? "").trim().toLowerCase() === AURA_SLOT,
  );
  const creatureIcon = parseCreature(blobs.creature);
  return {
    title: { itemId: titleRow?.itemId ?? null, itemName: titleRow?.itemName ?? null },
    aura: { itemId: auraIcon?.itemId ?? null, itemName: auraIcon?.itemName ?? null },
    creature: {
      itemId: creatureIcon?.itemId ?? null,
      itemName: creatureIcon?.itemName ?? null,
    },
  };
}

/** Full progression matrix: roster joined to latest gear/fame snapshots and the
 *  manual note table. Three grouped queries — no per-character round-trips. */
export async function listProgression(): Promise<ProgressionRow[]> {
  const [roster, fameByChar, gearByChar, notes] = await Promise.all([
    listRoster(),
    getLatestFameByCharacter(),
    getLatestGearBlobsByCharacter(),
    listProgressionNotes(),
  ]);

  const noteByChar = new Map(notes.map((n) => [n.characterFk, n]));

  // Cosmetic-slot Atk. Amp. needs per-item detail lookups (cached in item_cache
  // + in-flight-deduped by getItem), so resolve every character concurrently.
  const rows = await Promise.all(
    roster.map(async (c): Promise<ProgressionRow> => {
      const gear = gearByChar.get(c.id);
      const note = noteByChar.get(c.id);
      const metrics: DerivedMetrics = gear
        ? deriveMetrics(gear)
        : {
            setName: null,
            setRarityName: null,
            setPoint: EMPTY_METRIC,
            amplify: EMPTY_METRIC,
            enchant: EMPTY_METRIC,
            buff: EMPTY_METRIC,
          };

      const slots = gear
        ? cosmeticSlotItems(gear)
        : {
            title: { itemId: null, itemName: null },
            aura: { itemId: null, itemName: null },
            creature: { itemId: null, itemName: null },
          };
      const [title, aura, creature] = await Promise.all([
        resolveSlotMetric("title", slots.title.itemId, slots.title.itemName),
        resolveSlotMetric("aura", slots.aura.itemId, slots.aura.itemName),
        resolveSlotMetric(
          "creature",
          slots.creature.itemId,
          slots.creature.itemName,
        ),
      ]);

      return {
        id: c.id,
        characterName: c.characterName,
        jobGrowName: c.jobGrowName,
        jobName: c.jobName,
        level: c.level,
        fame: fameByChar.get(c.id) ?? null,
        setName: metrics.setName,
        setRarityName: metrics.setRarityName,
        setPoint: metrics.setPoint,
        amplify: metrics.amplify,
        enchant: metrics.enchant,
        buff: metrics.buff,
        title,
        aura,
        creature,
        priority: note?.priority ?? null,
        note: note?.note ?? null,
        hasSnapshot: gear != null,
      };
    }),
  );

  // Manual priority first (asc, nulls last), then by fame desc as a tiebreak so
  // the strongest characters bubble up among the un-prioritized.
  return rows.sort((a, b) => {
    const ap = a.priority ?? Number.POSITIVE_INFINITY;
    const bp = b.priority ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;
    return (b.fame ?? 0) - (a.fame ?? 0);
  });
}

export interface ProgressionNoteInput {
  priority: number | null;
  note: string | null;
}

/**
 * Persist a manual drag order: each id's index in `orderedIds` becomes its
 * `priority` (asc). Upserts so characters without a note row are created; the
 * `note` text is preserved (only priority/updatedAt change on existing rows).
 */
export async function reorderProgression(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const now = Date.now();
  const [first, ...rest] = orderedIds.map((id, i) =>
    db
      .insert(progressionNote)
      .values({ characterFk: id, priority: i, updatedAt: now })
      .onConflictDoUpdate({
        target: progressionNote.characterFk,
        set: { priority: i, updatedAt: now },
      }),
  );
  // libSQL batch: one atomic transaction, single round-trip.
  await db.batch([first, ...rest]);
}

/** Upsert the manual priority/note for one character. */
export async function upsertProgressionNote(
  characterFk: string,
  input: ProgressionNoteInput,
): Promise<void> {
  const now = Date.now();
  await db
    .insert(progressionNote)
    .values({
      characterFk,
      priority: input.priority,
      note: input.note,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: progressionNote.characterFk,
      set: {
        priority: input.priority,
        note: input.note,
        updatedAt: now,
      },
    });
}
