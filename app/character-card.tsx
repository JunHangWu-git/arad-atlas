import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { RosterCharacter } from "@/lib/roster";
import { CharacterCardMenu } from "./character-card-menu";
import { CardPortrait } from "./card-portrait";

const fameFormatter = new Intl.NumberFormat("en-US");

// Deterministic tint per character so the monogram tile is stable across loads.
// (DFO Global API exposes no character portrait image — see plan; item images
// work but character renders 404, so we use a generated tile instead.)
function tintHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

interface CharacterCardProps {
  character: RosterCharacter;
  /** 1-based fame rank across the roster (1 = highest fame). Null if unranked. */
  rank?: number | null;
}

export function CharacterCard({ character: c, rank = null }: CharacterCardProps) {
  const initial = c.characterName.trim().charAt(0).toUpperCase() || "?";
  const hue = tintHue(c.id);
  const jobGrow = c.jobGrowName ?? c.jobName;

  return (
    <div className="relative group">
      <Link href={`/characters/${c.id}`} className="block">
        <Card className="overflow-hidden bg-[#0e1016] transition-transform transition-colors hover:-translate-y-0.5 hover:border-[var(--tier-fine)]">
          {/* Character render with rank disc + level in the corners. */}
          <div className="relative h-64 w-full overflow-hidden">
            <CardPortrait
              serverId={c.serverId}
              characterName={c.characterName}
              hue={hue}
              initial={initial}
            />
            {rank != null && (
              <span className="absolute bottom-2.5 left-2.5 z-10 grid size-7 place-items-center rounded-full border border-white/30 bg-[var(--tier-fine)] font-mono text-xs font-bold tabular-nums text-white shadow-md">
                {rank}
              </span>
            )}
            {c.level != null && (
              <span className="absolute bottom-2.5 right-2.5 z-10 rounded-md border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                Lv{c.level}
              </span>
            )}
          </div>

          {/* Body: dfogang-style centered identity block + headline metric. */}
          <div className="flex flex-col items-center gap-1 px-4 pb-4 pt-3 text-center">
            {c.adventureName && (
              <p className="max-w-full truncate text-xs text-muted-foreground">
                {c.adventureName}
              </p>
            )}
            <p className="max-w-full truncate text-2xl font-bold leading-tight tracking-tight">
              {c.characterName}
            </p>
            {jobGrow && (
              <p className="max-w-full truncate text-xs font-medium">
                <span style={{ color: "var(--fame)" }}>
                  [{c.jobGrowName ?? c.jobName}]
                </span>
              </p>
            )}
            {/* Fame — DFO-style fame readout: gold mark + compact sans number,
                standing in for dfogang's headline metric (no DPS on Global API). */}
            <div className="mt-1 flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny local icon, no need for next/image optimization */}
              <img
                src="/fame_icon.png"
                width={16}
                height={16}
                alt=""
                aria-hidden
                className="size-4 shrink-0"
              />
              <span className="font-sans text-base font-semibold tabular-nums leading-none text-foreground/90">
                {c.fame != null ? fameFormatter.format(c.fame) : "—"}
              </span>
            </div>
          </div>
        </Card>
      </Link>
      {/* Sibling of the Link (not nested) so menu clicks never navigate. */}
      <div className="absolute bottom-2.5 right-2.5">
        <CharacterCardMenu id={c.id} />
      </div>
    </div>
  );
}
