import { itemImageUrl, titleIconUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
import { combineStatEnchants } from "@/lib/gear";
import type { EquipmentRow } from "@/lib/gear";

interface EquipmentListProps {
  rows: EquipmentRow[];
}

/**
 * dfogang-style equipment list: each item is an icon beside a "+N" reinforce/amp
 * prefix, the rarity-tinted name and slot, fusion line, and an indented enchant
 * breakdown — mirroring the in-game Equipment view.
 */
export function EquipmentList({ rows }: EquipmentListProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No gear snapshot yet — refresh to capture equipment.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const amped = row.amplificationName != null;
        const enchant = combineStatEnchants(row.enchant);
        // Fusion stones live on armor/accessories — not the weapon or title slot.
        const showFusion =
          row.fusionName != null && row.slotName !== "Weapon" && row.slotName !== "Title";
        // Titles 404 on the Neople item CDN; dfogang renders them from id + name.
        const iconSrc = !row.itemId
          ? ""
          : row.slotName === "Title"
            ? titleIconUrl(row.itemId, row.itemName)
            : itemImageUrl(row.itemId);
        return (
          <li
            key={row.slotId || row.itemName}
            className="rounded-md bg-black/20 p-2"
          >
            {row.slotName && (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {row.slotName}
              </p>
            )}

            <div className="flex gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN; next/image cannot proxy these icons (see portrait.ts) */}
              <img
                src={iconSrc}
                width={32}
                height={32}
                alt=""
                loading="lazy"
                className="size-8 shrink-0 rounded border border-border bg-black/20"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm leading-tight">
                  {row.reinforce > 0 && (
                    <span
                      className="mr-1 font-mono font-semibold"
                      style={{ color: amped ? "var(--amp)" : "var(--reinforce)" }}
                      title={row.amplificationName ?? "Reinforce"}
                    >
                      +{row.reinforce}
                    </span>
                  )}
                  <span className={`font-medium ${rarityClass(row.itemRarity)}`}>
                    {row.itemName}
                  </span>
                </p>

                {showFusion && (
                <div className="mt-1.5 border-l-2 border-border pl-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fusion Stone
                  </p>
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN (see portrait.ts) */}
                    <img
                      src={row.fusionItemId ? itemImageUrl(row.fusionItemId) : ""}
                      width={24}
                      height={24}
                      alt=""
                      loading="lazy"
                      className="size-6 shrink-0 rounded border border-border bg-black/20"
                    />
                    <span className={`truncate text-sm ${rarityClass(row.fusionRarity)}`}>
                      {row.fusionName}
                    </span>
                  </div>
                </div>
              )}

              {enchant.length > 0 && (
                <div className="mt-1.5 border-l-2 border-border pl-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Enchant
                  </p>
                  <div className="space-y-0.5 text-[11px] leading-snug text-muted-foreground">
                    {enchant.map((e, i) => (
                      <div key={i} className="truncate">
                        {e.name}{" "}
                        <span className="text-foreground/90">{e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
