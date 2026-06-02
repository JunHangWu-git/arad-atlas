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
      className="relative min-h-[26rem] overflow-hidden rounded-xl border shadow"
      style={{ background: "#06070a" }}
    >
      {/* Class art over the black hero, biased to the upper-right and faded out
          on the left so it dissolves into the equipment composite */}
      {classArt && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url('${classArt}')`,
            backgroundSize: "auto 150%",
            backgroundPosition: "right 12%",
            backgroundRepeat: "no-repeat",
            opacity: 0.55,
            maskImage:
              "linear-gradient(to right, transparent 0%, transparent 38%, black 52%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, transparent 38%, black 52%)",
          }}
        />
      )}

      {/* Advanced class name, top-right corner */}
      {className && (
        <p className="absolute right-5 top-4 z-10 text-5xl font-bold italic tracking-tight text-white drop-shadow">
          {className}
        </p>
      )}

      {/* Left: character render + equipped-set level. The composite render has a
          definite width (height × art aspect); wrapping it with the label in an
          items-center column centers the set label under the render. The outer
          column left-aligns that block with edge padding. */}
      <div className="relative flex min-h-[26rem] flex-col items-start p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-[21rem] aspect-[492/354]">
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
              className="text-center text-sm font-semibold drop-shadow"
              style={{ color: setTierColor(set?.rarityName) }}
            >
              {setLabel}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
