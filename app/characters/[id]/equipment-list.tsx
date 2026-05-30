import { itemImageUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
import type { EquipmentRow } from "@/lib/gear";

interface EquipmentListProps {
  rows: EquipmentRow[];
}

/**
 * Detailed equipment table: item icon, name + slot, fusion, reinforcement /
 * amplification level, and the full enchantment list — mirroring the in-game
 * Equipment view.
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
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.slotId || row.itemName} className="flex gap-2.5 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN; next/image cannot proxy these icons (see portrait.ts) */}
          <img
            src={row.itemId ? itemImageUrl(row.itemId) : ""}
            width={28}
            height={28}
            alt=""
            loading="lazy"
            className="size-7 shrink-0 rounded border border-border bg-black/20"
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm leading-tight">
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
          </div>

          <div className="w-10 shrink-0 text-right">
            {row.reinforce > 0 && (
              <span
                className="font-mono text-xs font-semibold"
                style={{ color: row.amplificationName ? "var(--tier-fine)" : "var(--fame)" }}
                title={row.amplificationName ?? "Reinforce"}
              >
                +{row.reinforce}
              </span>
            )}
          </div>

          <div className="w-44 shrink-0 text-[11px] leading-snug text-muted-foreground">
            {row.enchant.map((e, i) => (
              <div key={i} className="truncate">
                <span style={{ color: "var(--tier-fine)" }}>{e.value}</span> {e.name}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
