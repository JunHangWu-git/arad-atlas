import { itemImageUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
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
    <ul className="space-y-3">
      {rows.map((row) => {
        const amped = row.amplificationName != null;
        return (
          <li key={row.slotId || row.itemName} className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN; next/image cannot proxy these icons (see portrait.ts) */}
            <img
              src={row.itemId ? itemImageUrl(row.itemId) : ""}
              width={36}
              height={36}
              alt=""
              loading="lazy"
              className="size-9 shrink-0 rounded border border-border bg-black/20"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight">
                {row.reinforce > 0 && (
                  <span
                    className="mr-1 font-mono font-semibold"
                    style={{ color: amped ? "var(--tier-fine)" : "var(--fame)" }}
                    title={row.amplificationName ?? "Reinforce"}
                  >
                    +{row.reinforce}
                  </span>
                )}
                <span className={`font-medium ${rarityClass(row.itemRarity)}`}>
                  {row.itemName}
                </span>{" "}
                {row.slotName && (
                  <span className="text-xs text-muted-foreground">{row.slotName}</span>
                )}
              </p>

              {row.fusionName && (
                <p className="truncate text-[11px] text-muted-foreground">
                  [Fusion]{" "}
                  <span className={rarityClass(row.fusionRarity)}>{row.fusionName}</span>
                  {row.fusionEffect ? ` · ${row.fusionEffect.split("\n")[0]}` : ""}
                </p>
              )}

              {row.enchant.length > 0 && (
                <div className="mt-1 space-y-0.5 border-l-2 border-border pl-2 text-[11px] leading-snug text-muted-foreground">
                  {row.enchant.map((e, i) => (
                    <div key={i} className="truncate">
                      <span style={{ color: "var(--tier-fine)" }}>{e.value}</span> {e.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
