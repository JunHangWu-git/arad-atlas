import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { RosterCharacter } from "@/lib/roster";
import { CharacterCardMenu } from "./character-card-menu";

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

export function CharacterCard({ character: c }: CharacterCardProps) {
  const initial = c.characterName.trim().charAt(0).toUpperCase() || "?";
  const hue = tintHue(c.id);

  return (
    <div className="relative group">
      <Link href={`/characters/${c.id}`} className="block">
        <Card className="overflow-hidden transition-transform transition-colors hover:-translate-y-0.5 hover:border-[var(--tier-fine)]">
          <div
            className="relative flex aspect-square w-full flex-col items-center justify-center gap-1.5"
            style={{ backgroundColor: `hsl(${hue} 45% 22%)` }}
          >
            {c.level != null && (
              <span className="absolute left-2.5 top-2.5 rounded-md border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-xs font-bold text-white">
                Lv{c.level}
              </span>
            )}
            <span className="text-6xl font-bold text-white/90 drop-shadow">
              {initial}
            </span>
            {(c.jobGrowName ?? c.jobName) && (
              <span className="flex flex-col items-center leading-tight">
                <span className="text-base font-medium text-white/80">
                  {c.jobGrowName ?? c.jobName}
                </span>
                {c.jobGrowName && c.jobName && (
                  <span className="text-xs font-normal text-white/50">
                    {c.jobName}
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="truncate text-lg font-medium">{c.characterName}</p>
            <p className="truncate font-mono text-sm text-muted-foreground">
              Fame{" "}
              <span style={{ color: "var(--fame)" }}>
                {c.fame != null ? fameFormatter.format(c.fame) : "—"}
              </span>
            </p>
          </div>
        </Card>
      </Link>
      {/* Sibling of the Link (not nested) so menu clicks never navigate. */}
      <div className="absolute right-2.5 top-2.5">
        <CharacterCardMenu id={c.id} />
      </div>
    </div>
  );
}
