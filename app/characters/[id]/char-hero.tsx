import type { RosterCharacter } from "@/lib/roster";
import type { EquipmentRow, EquipmentSet } from "@/lib/gear";
import { splitEquipmentForGrid } from "@/lib/gear";
import { EquipColumn } from "./equip-grid";

// Deterministic tint per character — matches the roster card monogram tile.
// (DFO Global API has no character portrait image; the endpoint 404s.)
function tintHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

interface CharHeroProps {
  char: RosterCharacter;
  equipment: EquipmentRow[];
  set: EquipmentSet | null;
  fame: number | null;
}

/**
 * Wide dfogang-style hero banner: the equipment grid flanks a monogram portrait
 * with the character identity beneath it, and the fame headline + equipped-set
 * badge sit on the right. We adapt the dfogang layout to the data the Global API
 * actually exposes (no DPS score, rank, sprite, or class art).
 */
export function CharHero({ char, equipment, set, fame }: CharHeroProps) {
  const { left, right } = splitEquipmentForGrid(equipment);
  const hue = tintHue(char.id);

  const subtitle = [
    char.jobGrowName ?? char.jobName,
    char.jobGrowName && char.jobName ? char.jobName : null,
    char.level != null ? `Lv ${char.level}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const affiliation = [
    char.adventureName,
    char.guildName ? `[${char.guildName}]` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const setLabel =
    set != null
      ? [set.rarityName ?? set.name, set.setPoint != null ? `(${set.setPoint})` : null]
          .filter(Boolean)
          .join(" ")
      : null;

  return (
    <section
      className="overflow-hidden rounded-xl border shadow"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 35% 12%) 0%, var(--panel) 55%, var(--panel-2) 100%)`,
      }}
    >
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Equipment grid wrapped around the portrait */}
        <div className="flex items-center justify-center gap-3">
          <EquipColumn rows={left} />

          <div className="flex flex-col items-center gap-2 px-1">
            <div
              className="flex size-20 items-center justify-center rounded-lg text-3xl font-black text-white/90 shadow-inner"
              style={{ backgroundColor: `hsl(${hue} 45% 24%)` }}
              aria-hidden
            >
              {char.characterName.trim().charAt(0).toUpperCase() || "?"}
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold leading-tight">{char.characterName}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              {affiliation && (
                <p className="text-xs text-muted-foreground">{affiliation}</p>
              )}
            </div>
          </div>

          <EquipColumn rows={right} />
        </div>

        {/* Fame headline + equipped-set badge */}
        <div className="text-center sm:text-right">
          {setLabel && (
            <p className="mb-1 text-sm font-semibold text-set">{setLabel}</p>
          )}
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Fame</p>
          <p className="font-mono text-4xl font-black text-tier-fine">
            {fame != null ? fame.toLocaleString() : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
