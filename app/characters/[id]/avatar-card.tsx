import { itemImageUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
import type { AvatarSlot } from "@/lib/gear";

/** Resolve an emblem's display color from its socket color, falling back to its name. */
function emblemColor(color: string | null, name: string): string {
  const byColor: Record<string, string> = {
    red: "#ff6b81",
    yellow: "#facc15",
    green: "#4ade80",
    blue: "#46b1ff",
    platinum: "#fb923c",
  };
  const c = (color ?? "").toLowerCase();
  if (byColor[c]) return byColor[c];

  const n = name.toLowerCase();
  for (const key of Object.keys(byColor)) {
    if (n.includes(key)) return byColor[key];
  }
  return "var(--tier-epic)";
}

interface AvatarCardProps {
  slot: AvatarSlot;
}

/** dfogang-style avatar card: slot label, base avatar + option, clone, emblems. */
export function AvatarCard({ slot }: AvatarCardProps) {
  return (
    <div className="rounded-xl bg-card p-4 shadow">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {slot.slotName}
      </p>

      <div className="flex gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN (see portrait.ts) */}
        <img
          src={slot.itemId ? itemImageUrl(slot.itemId) : ""}
          width={36}
          height={36}
          alt=""
          loading="lazy"
          className="size-9 shrink-0 rounded border border-border bg-black/20"
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium leading-tight ${rarityClass(slot.itemRarity)}`}>
            {slot.itemName}
          </p>
          {slot.optionAbility && (
            <p className="text-xs text-tier-epic">{slot.optionAbility}</p>
          )}
        </div>
      </div>

      {slot.clone && (
        <div className="mt-3 border-l-2 border-border pl-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Clone Avatar
          </p>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN (see portrait.ts) */}
            <img
              src={slot.clone.itemId ? itemImageUrl(slot.clone.itemId) : ""}
              width={24}
              height={24}
              alt=""
              loading="lazy"
              className="size-6 shrink-0 rounded border border-border bg-black/20"
            />
            <p className="min-w-0 flex-1 truncate text-sm">{slot.clone.itemName}</p>
          </div>
        </div>
      )}

      {slot.emblems.length > 0 && (
        <div className="mt-3 border-l-2 border-border pl-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Emblems
          </p>
          <ul className="space-y-0.5">
            {slot.emblems.map((e, i) => (
              <li
                key={`${e.itemId ?? "x"}-${i}`}
                className="truncate text-xs"
                style={{ color: emblemColor(e.color, e.itemName) }}
              >
                {e.itemName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
