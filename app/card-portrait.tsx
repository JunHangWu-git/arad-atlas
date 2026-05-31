"use client";

import { useState } from "react";

import { dfogangPortraitUrl } from "@/lib/neople/portrait";

interface CardPortraitProps {
  serverId: string;
  characterName: string;
  /** Hashed hue (0-359) for the monogram fallback tile. */
  hue: number;
  /** Monogram letter shown while loading / on render failure. */
  initial: string;
  /**
   * Skip the dark base fill so the render blends into a parent background
   * (used by the hero, which layers the sprite over class art). The monogram
   * fallback tile still gets its hue tint.
   */
  transparent?: boolean;
}

export function CardPortrait({
  serverId,
  characterName,
  hue,
  initial,
  transparent = false,
}: CardPortraitProps) {
  const [failed, setFailed] = useState(false);
  // Deterministic URL (no cache-buster) so SSR and hydration agree. Falls back
  // to the hashed-hue monogram tile if the render 404s.
  const src = dfogangPortraitUrl(serverId, characterName);

  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{
        // Dark base like dfogang; the hashed hue only tints the monogram
        // fallback so a missing render still reads as that character.
        backgroundColor: failed
          ? `hsl(${hue} 45% 22%)`
          : transparent
            ? "transparent"
            : "#0e1016",
      }}
    >
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element -- 3rd-party dfogang render CDN; next/image cannot proxy it
        <img
          src={src}
          alt={characterName}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      {failed && (
        <span className="text-6xl font-bold text-white/90 drop-shadow">
          {initial}
        </span>
      )}
    </div>
  );
}
