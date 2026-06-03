/**
 * Attack-amplification ("Atk. Amp.") tiering for the cosmetic progression
 * columns (title, aura, creature). The amp % is an intrinsic item property — it
 * is NOT in the gear snapshot, only in the item-detail endpoint's `itemStatus`
 * (e.g. `{ name: "Atk. Amp.", value: "20%" }`). This module is pure (no DB / no
 * network) so it can be unit-tested in isolation; the item lookup lives in
 * lib/progression.
 */

/** Traffic-light state plus `teal` (above-best, e.g. Primeval) and `none`
 *  (empty slot / nothing equipped). */
export type MetricStatus = "todo" | "partial" | "done" | "teal" | "none";

/** One color-coded matrix cell: a short display value + its status, plus an
 *  optional hover tooltip (used to show the equipped item name behind a %). */
export interface ProgressionMetric {
  label: string;
  status: MetricStatus;
  tooltip?: string;
}

export type AmpSlot = "title" | "aura" | "creature";

/** Per-slot Atk. Amp. thresholds (percent). `teal` is an optional top tier
 *  above `green`. Anything below `yellow` is red ("todo"). Tune freely. */
export interface AmpThreshold {
  green: number;
  yellow: number;
  teal?: number;
}

export const AMP_THRESHOLDS: Record<AmpSlot, AmpThreshold> = {
  title: { green: 20, yellow: 18 },
  aura: { green: 12, yellow: 10 },
  creature: { green: 25, yellow: 20, teal: 40 },
};

/**
 * Pull the Atk. Amp. percent from an item-detail `itemStatus` array. Values
 * arrive as either `"20%"` or `20`; both yield `20`. Returns null when the item
 * has no Atk. Amp. stat at all. (Titles & creatures carry it here.)
 */
export function parseAtkAmpPct(itemStatus: unknown): number | null {
  if (!Array.isArray(itemStatus)) return null;
  for (const entry of itemStatus) {
    if (entry == null || typeof entry !== "object") continue;
    const e = entry as { name?: unknown; value?: unknown };
    if (typeof e.name !== "string") continue;
    if (e.name.trim().toLowerCase() !== "atk. amp.") continue;
    const raw = e.value;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const n = parseFloat(raw.replace("%", "").trim());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
  return null;
}

/**
 * Pull the Atk. Amp. percent out of free-text item-description fields. Auras
 * express their amp in the description (`itemExplain` / `itemExplainDetail`)
 * rather than `itemStatus`. Matches the first "Atk. Amp ... N%" occurrence.
 */
export function parseAtkAmpFromText(
  ...texts: Array<string | null | undefined>
): number | null {
  const re = /Atk\.?\s*Amp\.?[^%\d]*?([0-9]+(?:\.[0-9]+)?)\s*%/i;
  for (const t of texts) {
    if (!t) continue;
    const m = t.match(re);
    if (m) {
      const n = parseFloat(m[1]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Item-detail shape the amp readers care about (a subset of the API item). */
export interface AmpItemDetail {
  itemStatus?: unknown;
  itemExplain?: unknown;
  itemExplainDetail?: unknown;
}

/** Resolve an item's Atk. Amp. percent: `itemStatus` first (title/creature),
 *  then the description text (aura). Returns null when neither carries it. */
export function itemAtkAmpPct(item: AmpItemDetail): number | null {
  const fromStatus = parseAtkAmpPct(item.itemStatus);
  if (fromStatus != null) return fromStatus;
  const explain =
    typeof item.itemExplain === "string" ? item.itemExplain : null;
  const detail =
    typeof item.itemExplainDetail === "string" ? item.itemExplainDetail : null;
  return parseAtkAmpFromText(detail, explain);
}

/**
 * Classify an Atk. Amp. percent into a color-coded metric for a given slot.
 * `pct == null` means the equipped item grants no amp (treated as 0% → red).
 * The label shows the percent; pass `itemName` to surface it as a tooltip.
 */
export function ampMetric(
  slot: AmpSlot,
  pct: number | null,
  itemName?: string | null,
): ProgressionMetric {
  const t = AMP_THRESHOLDS[slot];
  const value = pct ?? 0;
  let status: MetricStatus;
  if (t.teal != null && value >= t.teal) status = "teal";
  else if (value >= t.green) status = "done";
  else if (value >= t.yellow) status = "partial";
  else status = "todo";
  return {
    label: `Atk. Amp. +${value}%`,
    status,
    tooltip: itemName ?? undefined,
  };
}
