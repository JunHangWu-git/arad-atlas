import { itemImageUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
import type {
  BuffEnhancement as BuffEnhancementData,
  AvatarSlot,
  ItemIcon,
} from "@/lib/gear";
import { AvatarCard } from "./avatar-card";

interface BuffEnhancementPanelProps {
  data: BuffEnhancementData;
  avatars: AvatarSlot[];
  creatures: ItemIcon[];
}

/** Small section header used across the buff-enhancement panel. */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * dfogang "Buff Enhancement" panel: the buff skill name + level, then the
 * equipped buff equipment, buff avatars, and buff creature — each row boxed in
 * its own darker cell. Degrades to an empty-state message when nothing buff-
 * related has been snapshotted.
 */
export function BuffEnhancementPanel({
  data,
  avatars,
  creatures,
}: BuffEnhancementPanelProps) {
  const hasSkill = data.skillName != null;
  const hasEquipment = data.equipment.length > 0;
  const hasAvatars = avatars.length > 0;
  const hasCreatures = creatures.length > 0;

  if (!hasSkill && !hasEquipment && !hasAvatars && !hasCreatures) {
    return (
      <p className="text-sm text-muted-foreground">
        No buff snapshot yet — refresh to capture buff enhancement.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {hasSkill && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded text-sm font-bold text-tier-epic"
            style={{ backgroundColor: "color-mix(in oklab, var(--tier-epic) 20%, transparent)" }}
            aria-hidden
          >
            ✦
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-tier-epic">{data.skillName}</p>
          </div>
          {data.level != null && (
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="font-mono text-sm font-semibold text-muted-foreground">
                Lv.{data.level}
              </span>
              {data.level >= 20 && (
                <span className="rounded bg-tier-legend/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tier-legend">
                  Max
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {hasEquipment && (
        <div className="space-y-2">
          <GroupLabel>Equipped Buff Equipment</GroupLabel>
          <ul className="space-y-1">
            {data.equipment.map((item, i) => (
              <li
                key={item.itemId ?? i}
                className="flex items-center gap-2 rounded-md bg-black/20 px-2 py-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN (see portrait.ts) */}
                <img
                  src={item.itemId ? itemImageUrl(item.itemId) : ""}
                  width={22}
                  height={22}
                  alt=""
                  loading="lazy"
                  className="size-[22px] shrink-0 rounded border border-border bg-black/20"
                />
                <span className={`truncate text-xs ${rarityClass(item.itemRarity)}`}>
                  {item.itemName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasAvatars && (
        <div className="space-y-2">
          <GroupLabel>Equipped Buff Avatar</GroupLabel>
          <div className="space-y-3">
            {avatars.map((slot) => (
              <AvatarCard key={slot.slotName} slot={slot} />
            ))}
          </div>
        </div>
      )}

      {hasCreatures && (
        <div className="space-y-2">
          <GroupLabel>Creature</GroupLabel>
          <ul className="space-y-2">
            {creatures.map((item, i) => (
              <li
                key={item.itemId ?? i}
                className="flex items-center gap-2.5 rounded-lg bg-black/20 p-2.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN (see portrait.ts) */}
                <img
                  src={item.itemId ? itemImageUrl(item.itemId) : ""}
                  width={32}
                  height={32}
                  alt=""
                  loading="lazy"
                  className="size-8 shrink-0 rounded border border-border bg-black/20"
                />
                <span className={`truncate text-sm ${rarityClass(item.itemRarity)}`}>
                  {item.itemName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
