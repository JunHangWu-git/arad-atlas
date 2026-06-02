import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { RosterCharacter } from "@/lib/roster";
import { classArtUrl } from "@/lib/neople/portrait";
import { setTierColor } from "@/lib/rarity";
import { setIconUrl } from "@/lib/set-icon";
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
}

function CharacterCardInner({ character: c }: CharacterCardProps) {
  const initial = c.characterName.trim().charAt(0).toUpperCase() || "?";
  const hue = tintHue(c.id);
  const jobGrow = c.jobGrowName ?? c.jobName;
  const classArt = c.jobName
    ? classArtUrl(c.jobName, c.jobGrowName ?? "", "card")
    : null;

  return (
    <div className="relative group">
      <Link href={`/characters/${c.id}`} draggable={false} className="block">
        <Card className="relative overflow-hidden bg-black transition-transform transition-colors group-hover/cell:-translate-y-0.5 group-hover/cell:border-[var(--tier-fine)]">
          {/* Faint full-card class art behind everything; a dark gradient keeps
              the body text legible over it. */}
          {classArt && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 75%, #000 100%), url('${classArt}')`,
                backgroundSize: "cover",
                backgroundPosition: "top center",
                backgroundRepeat: "no-repeat",
                opacity: 0.45,
              }}
            />
          )}
          {/* Character render with level in the corner. */}
          <div className="relative z-10 h-72 w-full overflow-hidden">
            <CardPortrait
              serverId={c.serverId}
              characterName={c.characterName}
              hue={hue}
              initial={initial}
              transparent
              preview
            />
            {c.level != null && (
              <span className="absolute bottom-2.5 right-2.5 z-10 rounded-md border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                Lv{c.level}
              </span>
            )}
          </div>

          {/* Body: dfogang-style centered identity block + headline metric. */}
          <div className="relative z-10 flex flex-col items-center gap-1 px-4 pb-4 pt-3 text-center">
            {c.adventureName && (
              <p className="max-w-full truncate text-xs text-muted-foreground">
                {c.adventureName}
              </p>
            )}
            <p className="max-w-full truncate text-2xl font-bold leading-tight tracking-tight">
              {c.characterName}
            </p>
            {jobGrow && (
              <p
                className="max-w-full truncate text-xs font-medium"
                style={{ color: "#C8B878" }}
              >
                [{c.jobGrowName ?? c.jobName}]
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
              <span
                className="font-sans text-xs font-semibold tabular-nums leading-none"
                style={{ color: "var(--set)" }}
              >
                {c.fame != null ? fameFormatter.format(c.fame) : "—"}
              </span>
            </div>

            {/* Equipment set — dfogang-style green set-point readout: set name
                + current set-point total in parentheses. Hidden until a gear
                snapshot exists. */}
            {c.equipmentSet && (
              <div
                className="flex items-center gap-1 text-xs leading-none"
                style={{ color: setTierColor(c.equipmentSet.rarityName) }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- external dfogang CDN icon, no next/image optimization */}
                <img
                  src={setIconUrl(c.equipmentSet.name)}
                  width={14}
                  height={14}
                  alt=""
                  aria-hidden
                  className="size-3.5 shrink-0"
                />
                <span className="max-w-full truncate font-medium">
                  {c.equipmentSet.name}
                  {c.equipmentSet.setPoint != null && (
                    <span className="ml-1 tabular-nums">
                      ({c.equipmentSet.setPoint})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </Card>
      </Link>
      {/* Sibling of the Link (not nested) so menu clicks never navigate. */}
      <div className="absolute right-2.5 top-2.5 z-10">
        <CharacterCardMenu id={c.id} />
      </div>
    </div>
  );
}

export const CharacterCard = React.memo(CharacterCardInner);
CharacterCard.displayName = "CharacterCard";
