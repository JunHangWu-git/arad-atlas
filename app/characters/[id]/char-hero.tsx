import type { RosterCharacter } from "@/lib/roster";
import type { EquipmentSet } from "@/lib/gear";
import { setTierColor } from "@/lib/rarity";
import { classArtUrl } from "@/lib/neople/portrait";
import { CardPortrait } from "@/app/card-portrait";

// Deterministic tint per character — drives the gradient + monogram fallback.
function tintHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

interface CharHeroProps {
  char: RosterCharacter;
  set: EquipmentSet | null;
}

/**
 * dfogang-style hero banner: the character render + equipped-set level sit on
 * the left, the full class art fades in on the right, and the advanced class
 * name sits in the top-right corner.
 */
export function CharHero({ char, set }: CharHeroProps) {
  const hue = tintHue(char.id);
  const classArt = char.jobName
    ? classArtUrl(char.jobName, char.jobGrowName ?? "", "full")
    : null;
  const className = char.jobGrowName ?? char.jobName;

  const setLabel =
    set != null
      ? [set.rarityName ?? set.name, set.setPoint != null ? `(${set.setPoint})` : null]
          .filter(Boolean)
          .join(" ")
      : null;

  return (
    <section
      className="relative min-h-[22rem] overflow-hidden rounded-xl border shadow"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 35% 12%) 0%, var(--panel) 55%, var(--panel-2) 100%)`,
      }}
    >
      {/* Full class art, anchored right, faded into the panel on the left */}
      {classArt && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url('${classArt}')`,
            backgroundSize: "cover",
            backgroundPosition: "100% 15%",
            backgroundRepeat: "no-repeat",
            maskImage:
              "linear-gradient(to right, transparent 0%, transparent 30%, black 75%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, transparent 30%, black 75%)",
          }}
        />
      )}

      {/* Advanced class name, top-right corner */}
      {className && (
        <p className="absolute right-4 top-4 z-10 text-lg font-bold text-white drop-shadow">
          {className}
        </p>
      )}

      {/* Left: character render + equipped-set level */}
      <div className="relative flex flex-col items-center gap-3 p-5 sm:items-start">
        <div className="relative h-48 w-40">
          <CardPortrait
            serverId={char.serverId}
            characterName={char.characterName}
            hue={hue}
            initial={char.characterName.trim().charAt(0).toUpperCase() || "?"}
            transparent
          />
        </div>
        {setLabel && (
          <p
            className="text-sm font-semibold drop-shadow"
            style={{ color: setTierColor(set?.rarityName) }}
          >
            {setLabel}
          </p>
        )}
      </div>
    </section>
  );
}
