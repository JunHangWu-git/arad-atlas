import { itemImageUrl, titleIconUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
import type { EquipmentRow } from "@/lib/gear";

interface EquipCellProps {
  row: EquipmentRow;
}

/** One equipment tile: item icon, rarity-tinted border, and a "+N" reinforce/amp badge. */
function EquipCell({ row }: EquipCellProps) {
  const amped = row.amplificationName != null;
  // Titles 404 on the Neople item CDN; dfogang renders them from id + name.
  const iconSrc = !row.itemId
    ? ""
    : row.slotName === "Title"
      ? titleIconUrl(row.itemId, row.itemName)
      : itemImageUrl(row.itemId);
  const title = [
    row.itemName,
    row.slotName ? `(${row.slotName})` : null,
    row.reinforce > 0 ? `+${row.reinforce}${amped ? " amp" : ""}` : null,
    ...row.enchant.map((e) => `${e.value} ${e.name}`),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative size-11 shrink-0" title={title}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN; next/image cannot proxy these icons (see portrait.ts) */}
      <img
        src={iconSrc}
        width={44}
        height={44}
        alt=""
        loading="lazy"
        className={`size-11 rounded border bg-black/30 object-cover ${rarityClass(row.itemRarity)}`}
        style={{ borderColor: "currentColor" }}
      />
      {row.reinforce > 0 && (
        <span
          className="absolute -left-1 -top-1 rounded px-1 font-mono text-[10px] font-bold leading-tight text-white shadow"
          style={{ backgroundColor: amped ? "var(--amp)" : "var(--reinforce)" }}
        >
          +{row.reinforce}
        </span>
      )}
    </div>
  );
}

interface EquipColumnProps {
  rows: EquipmentRow[];
}

/** A two-wide column of equipment tiles (one flank of the hero grid). */
export function EquipColumn({ rows }: EquipColumnProps) {
  if (rows.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {rows.map((row) => (
        <EquipCell key={row.slotId || row.itemName} row={row} />
      ))}
    </div>
  );
}
