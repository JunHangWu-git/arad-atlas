"use client";

import { useState } from "react";

interface CardPortraitProps {
  serverId: string;
  characterName: string;
  /** Hashed hue (0-359) for the monogram fallback tile. */
  hue: number;
  /** Monogram letter shown while loading / on render failure. */
  initial: string;
}

// dfogang composites and serves its own character render (Neople's portrait
// endpoint 404s). We hotlink it for an exact-match card center, and fall back
// to the hashed-hue monogram tile if their image is missing or blocked.
function dfogangRenderUrl(serverId: string, characterName: string): string {
  const server = serverId.toLowerCase();
  return `https://api.dfogang.com/image/preview/${server}/${encodeURIComponent(
    characterName,
  )}.png`;
}

export function CardPortrait({
  serverId,
  characterName,
  hue,
  initial,
}: CardPortraitProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{
        // Dark base like dfogang; the hashed hue only tints the monogram
        // fallback so a missing render still reads as that character.
        backgroundColor: failed ? `hsl(${hue} 45% 22%)` : "#0e1016",
      }}
    >
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element -- 3rd-party dfogang render CDN; next/image cannot proxy it
        <img
          src={dfogangRenderUrl(serverId, characterName)}
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
