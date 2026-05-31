import { itemImageUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
import type { BuffEnhancement as BuffEnhancementData } from "@/lib/gear";

interface BuffEnhancementPanelProps {
  data: BuffEnhancementData;
}

/**
 * dfogang "Buff Enhancement" panel: the buff skill name + level over the list of
 * equipped buff equipment. Degrades to an empty-state message when no buff data
 * has been snapshotted.
 */
export function BuffEnhancementPanel({ data }: BuffEnhancementPanelProps) {
  const hasSkill = data.skillName != null;
  const hasEquipment = data.equipment.length > 0;

  if (!hasSkill && !hasEquipment) {
    return (
      <p className="text-sm text-muted-foreground">
        No buff snapshot yet — refresh to capture buff enhancement.
      </p>
    );
  }

  return (
    <div className="space-y-4">
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
            <span className="shrink-0 font-mono text-sm font-semibold text-muted-foreground">
              Lv.{data.level}
            </span>
          )}
        </div>
      )}

      {hasEquipment && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Equipped Buff Equipment
          </p>
          <ul className="space-y-1.5">
            {data.equipment.map((item, i) => (
              <li key={item.itemId ?? i} className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN (see portrait.ts) */}
                <img
                  src={item.itemId ? itemImageUrl(item.itemId) : ""}
                  width={24}
                  height={24}
                  alt=""
                  loading="lazy"
                  className="size-6 shrink-0 rounded border border-border bg-black/20"
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
