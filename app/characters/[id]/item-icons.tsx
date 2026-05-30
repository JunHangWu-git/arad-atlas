import { itemImageUrl } from "@/lib/neople/portrait";
import type { ItemIcon } from "@/lib/gear";

interface ItemIconStripProps {
  items: ItemIcon[];
}

/** Compact grid of item icons (avatars, creature, …) with rarity-tinted names on hover. */
export function ItemIconStrip({ items }: ItemIconStripProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <div
          key={item.itemId ?? i}
          className="group/icon relative"
          title={`${item.itemName}${item.slotName ? ` (${item.slotName})` : ""}${item.note ? ` — ${item.note}` : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN; next/image cannot proxy these icons (see portrait.ts) */}
          <img
            src={item.itemId ? itemImageUrl(item.itemId) : ""}
            width={28}
            height={28}
            alt={item.itemName}
            loading="lazy"
            className="size-7 rounded border border-border bg-black/20"
          />
        </div>
      ))}
    </div>
  );
}
